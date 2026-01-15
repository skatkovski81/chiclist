import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardLayout, ProductsEmptyState, FilterableProducts } from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch user's lists with product counts
  const listsData = await prisma.list.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { savedProducts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert to plain objects for client components
  const lists = listsData.map((list) => ({
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    _count: { savedProducts: list._count.savedProducts },
  }));

  // Fetch item counts
  const [allItemsCount, purchasedCount] = await Promise.all([
    prisma.savedProduct.count({
      where: { userId: session.user.id },
    }),
    prisma.savedProduct.count({
      where: { userId: session.user.id, isPurchased: true },
    }),
  ]);

  // Fetch user's saved products with full product details and price history
  const savedProductsData = await prisma.savedProduct.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          priceHistory: {
            orderBy: { checkedAt: "asc" },
            take: 1, // Just get the first (oldest) price for comparison
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert to plain objects for client components
  const products = savedProductsData.map((sp) => {
    const currentPrice = sp.product.currentPrice ? Number(sp.product.currentPrice) : 0;
    const originalPrice = sp.product.priceHistory[0]?.price
      ? Number(sp.product.priceHistory[0].price)
      : currentPrice;

    return {
      id: sp.product.id,
      url: sp.product.url,
      title: sp.product.title,
      retailer: sp.product.retailer || "Unknown",
      currentPrice,
      originalPrice,
      imageUrl: sp.product.imageUrl,
      lastChecked: sp.product.lastChecked?.toISOString() || null,
      notifyOnPriceDrop: sp.notifyOnPriceDrop,
    };
  });

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      lists={lists}
      itemCounts={{
        all: allItemsCount,
        purchased: purchasedCount,
      }}
    >
      <FilterableProducts
        products={products}
        title="All Items"
        emptyState={<ProductsEmptyState />}
      />
    </DashboardLayout>
  );
}

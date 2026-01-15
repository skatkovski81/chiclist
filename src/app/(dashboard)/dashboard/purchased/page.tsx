import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardLayout, EmptyState, FilterableProducts } from "@/components/dashboard";
import { CheckCircle } from "lucide-react";

export default async function PurchasedPage() {
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

  // Fetch user's purchased products with full product details
  const purchasedProductsData = await prisma.savedProduct.findMany({
    where: {
      userId: session.user.id,
      isPurchased: true,
    },
    include: {
      product: {
        include: {
          priceHistory: {
            orderBy: { checkedAt: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  // Convert to plain objects for client components
  const products = purchasedProductsData.map((sp) => {
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
      isPurchased: true,
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
        title="Purchased"
        showPurchasedBadge
        emptyState={
          <EmptyState
            icon={<CheckCircle className="w-10 h-10 text-[#B5C4B1]" />}
            title="No purchased items yet"
            description="Mark items as purchased from your wishlist to see them here."
          />
        }
      />
    </DashboardLayout>
  );
}

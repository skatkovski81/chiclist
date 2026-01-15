import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardLayout, EmptyState, FilterableProducts } from "@/components/dashboard";
import { Folder } from "lucide-react";

interface ListPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListPage({ params }: ListPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch the list with its products and price history
  const list = await prisma.list.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      savedProducts: {
        include: {
          product: {
            include: {
              priceHistory: {
                orderBy: { checkedAt: "asc" },
                take: 1, // Get first (oldest) price for comparison
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { savedProducts: true },
      },
    },
  });

  if (!list) {
    notFound();
  }

  // Fetch user's lists with product counts for sidebar
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
  const lists = listsData.map((l) => ({
    id: l.id,
    name: l.name,
    emoji: l.emoji,
    _count: { savedProducts: l._count.savedProducts },
  }));

  // Fetch item counts for sidebar
  const [allItemsCount, purchasedCount] = await Promise.all([
    prisma.savedProduct.count({
      where: { userId: session.user.id },
    }),
    prisma.savedProduct.count({
      where: { userId: session.user.id, isPurchased: true },
    }),
  ]);

  // Convert products to plain objects for client components
  const products = list.savedProducts.map((sp) => {
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
      isPurchased: sp.isPurchased,
      lastChecked: sp.product.lastChecked?.toISOString() || null,
      notifyOnPriceDrop: sp.notifyOnPriceDrop,
    };
  });

  // Create title with emoji
  const listTitle = list.emoji ? `${list.emoji} ${list.name}` : list.name;

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
        title={listTitle}
        emptyState={
          <EmptyState
            icon={<Folder className="w-10 h-10 text-[#F4C2C2]" />}
            title="No products in this list"
            description="Add products to this list from the Add Product modal or move existing products here."
          />
        }
      />
    </DashboardLayout>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/dashboard";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
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
  const lists = listsData.map((list) => ({
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    _count: { savedProducts: list._count.savedProducts },
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

  // Fetch user settings
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      emailNotifications: true,
    },
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2C2C2C]">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and notification preferences</p>
      </div>

      {/* Settings Form */}
      <SettingsForm
        initialEmail={user?.email || ""}
        initialName={user?.name || ""}
        initialEmailNotifications={user?.emailNotifications ?? true}
      />
    </DashboardLayout>
  );
}

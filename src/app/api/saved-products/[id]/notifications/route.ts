import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notifyOnPriceDrop, targetPrice } = body;

    // Find the saved product and verify ownership
    const savedProduct = await prisma.savedProduct.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!savedProduct) {
      return NextResponse.json(
        { error: "Saved product not found" },
        { status: 404 }
      );
    }

    // Update notification preferences
    const updated = await prisma.savedProduct.update({
      where: { id },
      data: {
        notifyOnPriceDrop:
          notifyOnPriceDrop !== undefined
            ? notifyOnPriceDrop
            : savedProduct.notifyOnPriceDrop,
        targetPrice:
          targetPrice !== undefined
            ? targetPrice === null
              ? null
              : parseFloat(targetPrice)
            : savedProduct.targetPrice,
      },
    });

    return NextResponse.json({
      success: true,
      notifyOnPriceDrop: updated.notifyOnPriceDrop,
      targetPrice: updated.targetPrice ? Number(updated.targetPrice) : null,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}

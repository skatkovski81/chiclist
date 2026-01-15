import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/products/[id] - Get single product details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the saved product for this user
    const savedProduct = await prisma.savedProduct.findFirst({
      where: {
        productId: id,
        userId: session.user.id,
      },
      include: {
        product: {
          include: {
            priceHistory: {
              orderBy: { checkedAt: "desc" },
              take: 10,
            },
          },
        },
        list: true,
      },
    });

    if (!savedProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Format the response
    const response = {
      id: savedProduct.product.id,
      savedProductId: savedProduct.id,
      url: savedProduct.product.url,
      title: savedProduct.product.title,
      imageUrl: savedProduct.product.imageUrl,
      currentPrice: savedProduct.product.currentPrice ? Number(savedProduct.product.currentPrice) : null,
      currency: savedProduct.product.currency,
      retailer: savedProduct.product.retailer,
      notes: savedProduct.notes,
      isPurchased: savedProduct.isPurchased,
      purchasedAt: savedProduct.purchasedAt,
      targetPrice: savedProduct.targetPrice ? Number(savedProduct.targetPrice) : null,
      notifyOnPriceDrop: savedProduct.notifyOnPriceDrop,
      listId: savedProduct.listId,
      list: savedProduct.list,
      createdAt: savedProduct.createdAt,
      priceHistory: savedProduct.product.priceHistory.map((ph) => ({
        price: Number(ph.price),
        checkedAt: ph.checkedAt,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] - Update product (notes, isPurchased, targetPrice)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { notes, isPurchased, targetPrice, listId } = body;

    // Find the saved product for this user
    const savedProduct = await prisma.savedProduct.findFirst({
      where: {
        productId: id,
        userId: session.user.id,
      },
    });

    if (!savedProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      notes?: string | null;
      isPurchased?: boolean;
      purchasedAt?: Date | null;
      targetPrice?: number | null;
      listId?: string | null;
    } = {};

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (isPurchased !== undefined) {
      updateData.isPurchased = isPurchased;
      updateData.purchasedAt = isPurchased ? new Date() : null;
    }

    if (targetPrice !== undefined) {
      updateData.targetPrice = targetPrice;
    }

    if (listId !== undefined) {
      updateData.listId = listId;
    }

    // Update the saved product
    const updated = await prisma.savedProduct.update({
      where: { id: savedProduct.id },
      data: updateData,
      include: {
        product: true,
      },
    });

    return NextResponse.json({
      id: updated.product.id,
      notes: updated.notes,
      isPurchased: updated.isPurchased,
      purchasedAt: updated.purchasedAt,
      targetPrice: updated.targetPrice ? Number(updated.targetPrice) : null,
      listId: updated.listId,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the saved product for this user
    const savedProduct = await prisma.savedProduct.findFirst({
      where: {
        productId: id,
        userId: session.user.id,
      },
    });

    if (!savedProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Delete the saved product
    await prisma.savedProduct.delete({
      where: { id: savedProduct.id },
    });

    // Optionally: Delete the product if no other users have it saved
    const otherSavedProducts = await prisma.savedProduct.count({
      where: { productId: id },
    });

    if (otherSavedProducts === 0) {
      // No other users have this product saved, delete the product and its price history
      await prisma.priceHistory.deleteMany({
        where: { productId: id },
      });
      await prisma.product.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

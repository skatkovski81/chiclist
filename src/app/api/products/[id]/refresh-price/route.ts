import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scrapeProductPrice } from "@/lib/scraper";

// POST /api/products/[id]/refresh-price - Refresh product price
export async function POST(
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

    // Find the saved product and its associated product
    const savedProduct = await prisma.savedProduct.findFirst({
      where: {
        productId: id,
        userId: session.user.id,
      },
      include: {
        product: true,
      },
    });

    if (!savedProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const product = savedProduct.product;
    const oldPrice = product.currentPrice ? Number(product.currentPrice) : null;

    // Scrape the current price from the URL
    const { price: newPrice, error } = await scrapeProductPrice(product.url);

    if (error) {
      return NextResponse.json(
        { error, oldPrice, newPrice: null, changed: false },
        { status: 400 }
      );
    }

    // If we couldn't get a price, return without updating
    if (newPrice === null) {
      // Still update lastChecked
      await prisma.product.update({
        where: { id: product.id },
        data: { lastChecked: new Date() },
      });

      return NextResponse.json({
        oldPrice,
        newPrice: null,
        changed: false,
        message: "Could not fetch price from website",
      });
    }

    // Check if price has changed
    const priceChanged = oldPrice !== newPrice;

    // Update product and create price history in a transaction
    await prisma.$transaction(async (tx) => {
      // Update product with new price and lastChecked
      await tx.product.update({
        where: { id: product.id },
        data: {
          currentPrice: newPrice,
          lastChecked: new Date(),
        },
      });

      // Always add to price history when we check (even if same price)
      await tx.priceHistory.create({
        data: {
          productId: product.id,
          price: newPrice,
        },
      });
    });

    // Calculate price change info
    let changeType: "dropped" | "increased" | "same" = "same";
    let changeAmount = 0;
    let changePercent = 0;

    if (oldPrice && priceChanged) {
      changeAmount = Math.abs(newPrice - oldPrice);
      changePercent = Math.round((changeAmount / oldPrice) * 100);
      changeType = newPrice < oldPrice ? "dropped" : "increased";
    }

    // Get notification settings
    const targetPrice = savedProduct.targetPrice ? Number(savedProduct.targetPrice) : null;
    const notifyOnPriceDrop = savedProduct.notifyOnPriceDrop;
    const isBelowTarget = targetPrice !== null && newPrice < targetPrice;

    // Create notification record if price dropped and notifications are enabled
    if (changeType === "dropped" && notifyOnPriceDrop && oldPrice) {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          productId: product.id,
          type: isBelowTarget ? "target_reached" : "price_drop",
          oldPrice,
          newPrice,
          targetPrice: savedProduct.targetPrice,
        },
      });
    }

    return NextResponse.json({
      oldPrice,
      newPrice,
      changed: priceChanged,
      changeType,
      changeAmount,
      changePercent,
      targetPrice,
      isBelowTarget,
    });
  } catch (error) {
    console.error("Error refreshing price:", error);
    return NextResponse.json(
      { error: "Failed to refresh price" },
      { status: 500 }
    );
  }
}

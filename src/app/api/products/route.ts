import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Helper to extract retailer name from URL
function extractRetailer(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Remove www. prefix
    const domain = hostname.replace(/^www\./, "");

    // Map common domains to retailer names
    const retailers: Record<string, string> = {
      "amazon.com": "Amazon",
      "amazon.co.uk": "Amazon UK",
      "amazon.ca": "Amazon Canada",
      "ebay.com": "eBay",
      "walmart.com": "Walmart",
      "target.com": "Target",
      "bestbuy.com": "Best Buy",
      "nordstrom.com": "Nordstrom",
      "macys.com": "Macy's",
      "sephora.com": "Sephora",
      "ulta.com": "Ulta",
      "etsy.com": "Etsy",
      "zappos.com": "Zappos",
      "asos.com": "ASOS",
      "zara.com": "Zara",
      "hm.com": "H&M",
      "nike.com": "Nike",
      "adidas.com": "Adidas",
      "apple.com": "Apple",
      "costco.com": "Costco",
      "kohls.com": "Kohl's",
      "wayfair.com": "Wayfair",
      "homedepot.com": "Home Depot",
      "lowes.com": "Lowe's",
    };

    // Check for exact match
    if (retailers[domain]) {
      return retailers[domain];
    }

    // Check for partial match (for subdomains)
    for (const [key, value] of Object.entries(retailers)) {
      if (domain.endsWith(key)) {
        return value;
      }
    }

    // Fallback: capitalize the main domain name
    const mainDomain = domain.split(".")[0];
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch {
    return "Unknown";
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, title, price, imageUrl, listId } = body;

    // Validate required fields
    if (!url || !title || price === undefined || price === null) {
      return NextResponse.json(
        { error: "URL, title, and price are required" },
        { status: 400 }
      );
    }

    // Validate price is a positive number
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json(
        { error: "Price must be a valid positive number" },
        { status: 400 }
      );
    }

    // Extract retailer from URL
    const retailer = extractRetailer(url);

    // Create the product, saved product, and price history in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if product with this URL already exists
      let product = await tx.product.findUnique({
        where: { url },
      });

      if (!product) {
        // Create new product
        product = await tx.product.create({
          data: {
            url,
            title,
            retailer,
            currentPrice: priceNum,
            imageUrl: imageUrl || null,
          },
        });

        // Create initial price history entry
        await tx.priceHistory.create({
          data: {
            productId: product.id,
            price: priceNum,
          },
        });
      }

      // Check if user already has this product saved
      const existingSavedProduct = await tx.savedProduct.findUnique({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId: product.id,
          },
        },
      });

      if (existingSavedProduct) {
        throw new Error("You have already saved this product");
      }

      // Create saved product linking user to product
      const savedProduct = await tx.savedProduct.create({
        data: {
          userId: session.user.id,
          productId: product.id,
          listId: listId || null,
        },
        include: {
          product: true,
        },
      });

      return savedProduct;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's saved products with product details
    const savedProducts = await prisma.savedProduct.findMany({
      where: { userId: session.user.id },
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(savedProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

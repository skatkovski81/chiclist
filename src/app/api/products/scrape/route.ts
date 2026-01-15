import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as cheerio from "cheerio";

interface ScrapedProduct {
  title: string | null;
  price: number | null;
  imageUrl: string | null;
  retailer: string;
}

// Helper to extract retailer name from URL
function extractRetailer(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const domain = hostname.replace(/^www\./, "");

    const retailers: Record<string, string> = {
      "amazon.com": "Amazon",
      "amazon.co.uk": "Amazon UK",
      "amazon.ca": "Amazon Canada",
      "amazon.de": "Amazon DE",
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
      "newegg.com": "Newegg",
      "bhphotovideo.com": "B&H Photo",
      "bloomingdales.com": "Bloomingdale's",
      "saksfifthavenue.com": "Saks Fifth Avenue",
      "neimanmarcus.com": "Neiman Marcus",
      "shopbop.com": "Shopbop",
      "net-a-porter.com": "Net-A-Porter",
      "ssense.com": "SSENSE",
      "farfetch.com": "Farfetch",
    };

    if (retailers[domain]) {
      return retailers[domain];
    }

    for (const [key, value] of Object.entries(retailers)) {
      if (domain.endsWith(key) || domain.includes(key.split(".")[0])) {
        return value;
      }
    }

    const mainDomain = domain.split(".")[0];
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch {
    return "Unknown";
  }
}

// Parse price from string - handles various formats
function parsePrice(priceStr: string | undefined | null): number | null {
  if (!priceStr) return null;

  // Clean the string
  let cleaned = priceStr.trim();

  // Remove currency symbols and text
  cleaned = cleaned.replace(/[£€¥₹$]/g, "");
  cleaned = cleaned.replace(/USD|EUR|GBP|CAD|AUD/gi, "");
  cleaned = cleaned.replace(/^\s*-\s*/, ""); // Remove leading dash

  // Extract just the numeric part with decimal
  const matches = cleaned.match(/[\d,]+\.?\d*/);
  if (!matches) return null;

  cleaned = matches[0];

  // Handle European format (1.234,56) vs US format (1,234.56)
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastPeriod = cleaned.lastIndexOf(".");
    if (lastComma > lastPeriod) {
      // European format
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US format
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal separator
      normalized = cleaned.replace(",", ".");
    } else {
      // Likely thousands separator
      normalized = cleaned.replace(/,/g, "");
    }
  }

  const price = parseFloat(normalized);
  return isNaN(price) || price <= 0 ? null : price;
}

// Extract JSON-LD structured data
function extractJsonLd($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;

      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];

      // Also check for @graph array
      for (const item of items) {
        if (item["@graph"]) {
          items.push(...item["@graph"]);
        }
      }

      for (const item of items) {
        const itemType = item["@type"];
        const isProduct = itemType === "Product" ||
          (Array.isArray(itemType) && itemType.includes("Product"));

        if (isProduct) {
          // Title
          if (item.name && !result.title) {
            result.title = item.name;
          }

          // Image - handle various formats
          if (!result.imageUrl) {
            let img = item.image;
            if (Array.isArray(img)) img = img[0];
            if (typeof img === "string") {
              result.imageUrl = img;
            } else if (img?.url) {
              result.imageUrl = img.url;
            } else if (img?.contentUrl) {
              result.imageUrl = img.contentUrl;
            }
          }

          // Price from offers
          if (!result.price && item.offers) {
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            const priceValue = offers?.price || offers?.lowPrice || offers?.highPrice;
            if (priceValue !== undefined) {
              result.price = typeof priceValue === "number" ? priceValue : parsePrice(String(priceValue));
            }
          }
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  });

  return result;
}

// Extract Open Graph and meta tags
function extractMetaTags($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  // Title - try multiple sources
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const metaTitle = $('meta[name="title"]').attr("content");
  const titleTag = $("title").text();

  result.title = ogTitle || twitterTitle || metaTitle || titleTag || null;

  // Clean up title - remove site name suffix
  if (result.title) {
    result.title = result.title
      .replace(/\s*[-|–—:]\s*[^-|–—:]*$/g, "")
      .replace(/\s*\|\s*[^|]*$/g, "")
      .trim();
  }

  // Image - try multiple sources
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogImageSecure = $('meta[property="og:image:secure_url"]').attr("content");
  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  const twitterImageSrc = $('meta[name="twitter:image:src"]').attr("content");

  result.imageUrl = ogImageSecure || ogImage || twitterImage || twitterImageSrc || null;

  // Price - try multiple meta tags
  const ogPrice = $('meta[property="og:price:amount"]').attr("content");
  const productPrice = $('meta[property="product:price:amount"]').attr("content");
  const priceAmount = $('meta[property="price:amount"]').attr("content");
  const itemPropPrice = $('meta[itemprop="price"]').attr("content");

  const priceStr = ogPrice || productPrice || priceAmount || itemPropPrice;
  if (priceStr) {
    result.price = parsePrice(priceStr);
  }

  return result;
}

// Amazon-specific extraction
function extractAmazon($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  // Title
  const productTitle = $("#productTitle").text().trim();
  const titleSpan = $("#title span").first().text().trim();
  result.title = productTitle || titleSpan || null;

  // Image - Amazon specific selectors
  const landingImage = $("#landingImage").attr("src") || $("#landingImage").attr("data-old-hires");
  const imgBlkFront = $("#imgBlkFront").attr("src");
  const mainImage = $("#main-image").attr("src");
  const imageBlockImg = $(".imgTagWrapper img").first().attr("src");

  result.imageUrl = landingImage || imgBlkFront || mainImage || imageBlockImg || null;

  // Try to get high-res image from data attributes
  if (!result.imageUrl || result.imageUrl.includes("._")) {
    const hiResData = $("#landingImage").attr("data-a-dynamic-image");
    if (hiResData) {
      try {
        const imageObj = JSON.parse(hiResData);
        const urls = Object.keys(imageObj);
        // Get the largest image
        if (urls.length > 0) {
          result.imageUrl = urls[urls.length - 1];
        }
      } catch {
        // Ignore
      }
    }
  }

  // Price - Amazon specific selectors (in order of preference)
  const priceSelectors = [
    ".a-price .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "#priceblock_saleprice",
    ".priceToPay .a-offscreen",
    "#corePrice_feature_div .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-offscreen",
    ".a-price-whole",
    "#price_inside_buybox",
    "#newBuyBoxPrice",
  ];

  for (const selector of priceSelectors) {
    const priceEl = $(selector).first();
    if (priceEl.length) {
      const priceText = priceEl.text().trim();
      const price = parsePrice(priceText);
      if (price) {
        result.price = price;
        break;
      }
    }
  }

  return result;
}

// Target-specific extraction
function extractTarget($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  // Title
  const productTitle = $('[data-test="product-title"]').text().trim();
  const h1Title = $("h1").first().text().trim();
  result.title = productTitle || h1Title || null;

  // Image
  const productImage = $('[data-test="product-image"] img').first().attr("src");
  const pictureImg = $("picture img").first().attr("src");
  result.imageUrl = productImage || pictureImg || null;

  // Price
  const priceEl = $('[data-test="product-price"]').first().text().trim();
  const currentPrice = $('[data-test="current-price"]').first().text().trim();
  result.price = parsePrice(priceEl || currentPrice);

  return result;
}

// Walmart-specific extraction
function extractWalmart($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  // Title
  const productTitle = $('[itemprop="name"]').first().text().trim();
  const h1Title = $("h1").first().text().trim();
  result.title = productTitle || h1Title || null;

  // Image
  const heroImage = $('[data-testid="hero-image"] img').attr("src");
  const mainImage = $(".hover-zoom-hero-image img").attr("src");
  result.imageUrl = heroImage || mainImage || null;

  // Price
  const priceEl = $('[itemprop="price"]').attr("content");
  const priceDisplay = $('[data-automation="buybox-product-price"]').text().trim();
  result.price = parsePrice(priceEl || priceDisplay);

  return result;
}

// Generic price extraction from common selectors
function extractGenericPrice($: cheerio.CheerioAPI): number | null {
  const priceSelectors = [
    '[itemprop="price"]',
    '[data-price]',
    '[data-product-price]',
    '.product-price',
    '.price-current',
    '.price-value',
    '.current-price',
    '.sale-price',
    '.special-price',
    '.offer-price',
    '#price',
    '.price',
    '[class*="price"]',
  ];

  for (const selector of priceSelectors) {
    const el = $(selector).first();
    if (el.length) {
      // Try data attributes first
      const dataPrice = el.attr("data-price") || el.attr("content") || el.attr("data-product-price");
      if (dataPrice) {
        const price = parsePrice(dataPrice);
        if (price) return price;
      }

      // Try text content
      const textPrice = el.text().trim();
      const price = parsePrice(textPrice);
      if (price) return price;
    }
  }

  // Try regex pattern for prices in the page
  const bodyText = $("body").text();
  const pricePattern = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = [...bodyText.matchAll(pricePattern)];

  // Return the first reasonable price found
  for (const match of matches) {
    const price = parsePrice(match[1]);
    if (price && price > 0 && price < 100000) {
      return price;
    }
  }

  return null;
}

// Generic image extraction
function extractGenericImage($: cheerio.CheerioAPI, baseUrl: string): string | null {
  // Try product-specific image selectors
  const imageSelectors = [
    '[itemprop="image"]',
    '.product-image img',
    '.product-gallery img',
    '.product-photo img',
    '#product-image img',
    '[data-testid="product-image"] img',
    '.gallery-image img',
    '.main-image img',
    'picture source',
    'picture img',
  ];

  for (const selector of imageSelectors) {
    const el = $(selector).first();
    if (el.length) {
      const src = el.attr("src") || el.attr("srcset")?.split(" ")[0] || el.attr("data-src");
      if (src && !src.includes("placeholder") && !src.includes("spinner")) {
        return makeAbsoluteUrl(src, baseUrl);
      }
    }
  }

  // Look for large images with product-related URLs
  const productImageKeywords = ["product", "media", "images", "catalog", "item", "goods"];
  const images = $("img").toArray();

  for (const img of images) {
    const src = $(img).attr("src") || $(img).attr("data-src");
    if (!src) continue;

    const srcLower = src.toLowerCase();
    const hasProductKeyword = productImageKeywords.some(keyword => srcLower.includes(keyword));

    if (hasProductKeyword) {
      const width = parseInt($(img).attr("width") || "0", 10);
      const height = parseInt($(img).attr("height") || "0", 10);

      // Prefer larger images
      if (width >= 200 || height >= 200 || (!width && !height)) {
        return makeAbsoluteUrl(src, baseUrl);
      }
    }
  }

  return null;
}

// Make relative URLs absolute
function makeAbsoluteUrl(url: string | null, baseUrl: string): string | null {
  if (!url) return null;

  if (url.startsWith("//")) {
    return "https:" + url;
  }

  if (url.startsWith("http")) {
    return url;
  }

  try {
    const base = new URL(baseUrl);
    return new URL(url, base.origin).toString();
  } catch {
    return url;
  }
}

// Identify retailer type from URL
function getRetailerType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("amazon")) return "amazon";
  if (hostname.includes("target")) return "target";
  if (hostname.includes("walmart")) return "walmart";

  return "generic";
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
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    // Fetch the webpage with browser-like headers
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const retailerType = getRetailerType(url);
    const retailerName = extractRetailer(url);

    // Initialize result
    let result: ScrapedProduct = {
      title: null,
      price: null,
      imageUrl: null,
      retailer: retailerName,
    };

    // 1. Try retailer-specific extraction first
    let retailerData: Partial<ScrapedProduct> = {};
    switch (retailerType) {
      case "amazon":
        retailerData = extractAmazon($);
        break;
      case "target":
        retailerData = extractTarget($);
        break;
      case "walmart":
        retailerData = extractWalmart($);
        break;
    }

    // 2. Extract from JSON-LD structured data
    const jsonLdData = extractJsonLd($);

    // 3. Extract from meta tags (og:, twitter:, etc.)
    const metaData = extractMetaTags($);

    // 4. Try generic extraction as fallback
    const genericPrice = extractGenericPrice($);
    const genericImage = extractGenericImage($, url);

    // Merge data with priority: Retailer-specific > JSON-LD > Meta > Generic
    result.title = retailerData.title || jsonLdData.title || metaData.title || null;
    result.price = retailerData.price || jsonLdData.price || metaData.price || genericPrice || null;
    result.imageUrl = retailerData.imageUrl || jsonLdData.imageUrl || metaData.imageUrl || genericImage || null;

    // Make image URL absolute if needed
    result.imageUrl = makeAbsoluteUrl(result.imageUrl, url);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error scraping product:", error);
    return NextResponse.json(
      { error: "Failed to scrape product data" },
      { status: 500 }
    );
  }
}

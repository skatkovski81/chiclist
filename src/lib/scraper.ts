import * as cheerio from "cheerio";

export interface ScrapedProduct {
  title: string | null;
  price: number | null;
  imageUrl: string | null;
  retailer: string;
}

// Parse price from string - handles various formats
export function parsePrice(priceStr: string | undefined | null): number | null {
  if (!priceStr) return null;

  let cleaned = priceStr.trim();
  cleaned = cleaned.replace(/[£€¥₹$]/g, "");
  cleaned = cleaned.replace(/USD|EUR|GBP|CAD|AUD/gi, "");
  cleaned = cleaned.replace(/^\s*-\s*/, "");

  const matches = cleaned.match(/[\d,]+\.?\d*/);
  if (!matches) return null;

  cleaned = matches[0];

  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastPeriod = cleaned.lastIndexOf(".");
    if (lastComma > lastPeriod) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = cleaned.replace(",", ".");
    } else {
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
          if (item.name && !result.title) {
            result.title = item.name;
          }

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

  const ogTitle = $('meta[property="og:title"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const metaTitle = $('meta[name="title"]').attr("content");
  const titleTag = $("title").text();

  result.title = ogTitle || twitterTitle || metaTitle || titleTag || null;

  if (result.title) {
    result.title = result.title
      .replace(/\s*[-|–—:]\s*[^-|–—:]*$/g, "")
      .replace(/\s*\|\s*[^|]*$/g, "")
      .trim();
  }

  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogImageSecure = $('meta[property="og:image:secure_url"]').attr("content");
  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  const twitterImageSrc = $('meta[name="twitter:image:src"]').attr("content");

  result.imageUrl = ogImageSecure || ogImage || twitterImage || twitterImageSrc || null;

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

  const productTitle = $("#productTitle").text().trim();
  const titleSpan = $("#title span").first().text().trim();
  result.title = productTitle || titleSpan || null;

  const landingImage = $("#landingImage").attr("src") || $("#landingImage").attr("data-old-hires");
  const imgBlkFront = $("#imgBlkFront").attr("src");
  const mainImage = $("#main-image").attr("src");
  const imageBlockImg = $(".imgTagWrapper img").first().attr("src");

  result.imageUrl = landingImage || imgBlkFront || mainImage || imageBlockImg || null;

  if (!result.imageUrl || result.imageUrl.includes("._")) {
    const hiResData = $("#landingImage").attr("data-a-dynamic-image");
    if (hiResData) {
      try {
        const imageObj = JSON.parse(hiResData);
        const urls = Object.keys(imageObj);
        if (urls.length > 0) {
          result.imageUrl = urls[urls.length - 1];
        }
      } catch {
        // Ignore
      }
    }
  }

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

// Generic price extraction
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
      const dataPrice = el.attr("data-price") || el.attr("content") || el.attr("data-product-price");
      if (dataPrice) {
        const price = parsePrice(dataPrice);
        if (price) return price;
      }

      const textPrice = el.text().trim();
      const price = parsePrice(textPrice);
      if (price) return price;
    }
  }

  const bodyText = $("body").text();
  const pricePattern = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = [...bodyText.matchAll(pricePattern)];

  for (const match of matches) {
    const price = parsePrice(match[1]);
    if (price && price > 0 && price < 100000) {
      return price;
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

// Get retailer type from URL
function getRetailerType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("amazon")) return "amazon";
  if (hostname.includes("target")) return "target";
  if (hostname.includes("walmart")) return "walmart";

  return "generic";
}

// Validate that a price is reasonable for a product
function isValidPrice(price: number | null | undefined): price is number {
  if (price === null || price === undefined) return false;
  return price >= 5 && price <= 10000;
}

export async function scrapeProductPrice(url: string): Promise<{ price: number | null; error?: string }> {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { price: null, error: `Failed to fetch URL: ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const retailerType = getRetailerType(url);

    // Try retailer-specific extraction first
    let price: number | null = null;

    if (retailerType === "amazon") {
      const amazonData = extractAmazon($);
      if (isValidPrice(amazonData.price)) {
        price = amazonData.price;
      }
    }

    // Try JSON-LD
    if (!price) {
      const jsonLdData = extractJsonLd($);
      if (isValidPrice(jsonLdData.price)) {
        price = jsonLdData.price;
      }
    }

    // Try meta tags
    if (!price) {
      const metaData = extractMetaTags($);
      if (isValidPrice(metaData.price)) {
        price = metaData.price;
      }
    }

    // Try generic extraction (but be more careful)
    if (!price) {
      const genericPrice = extractGenericPrice($);
      // Only use generic price if it's likely a product price (>= $15)
      if (isValidPrice(genericPrice) && genericPrice >= 15) {
        price = genericPrice;
      }
    }

    return { price };
  } catch (error) {
    console.error("Error scraping price:", error);
    return { price: null, error: "Failed to scrape price" };
  }
}

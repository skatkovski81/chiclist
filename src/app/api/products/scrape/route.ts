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
      // Marketplaces
      "amazon.com": "Amazon",
      "amazon.co.uk": "Amazon UK",
      "amazon.ca": "Amazon Canada",
      "amazon.de": "Amazon DE",
      "ebay.com": "eBay",
      "walmart.com": "Walmart",
      "target.com": "Target",
      "costco.com": "Costco",
      "etsy.com": "Etsy",

      // Electronics
      "bestbuy.com": "Best Buy",
      "newegg.com": "Newegg",
      "bhphotovideo.com": "B&H Photo",
      "apple.com": "Apple",

      // Luxury/Designer Fashion
      "net-a-porter.com": "Net-A-Porter",
      "farfetch.com": "Farfetch",
      "ssense.com": "SSENSE",
      "mytheresa.com": "Mytheresa",
      "matchesfashion.com": "MatchesFashion",
      "neimanmarcus.com": "Neiman Marcus",
      "saksfifthavenue.com": "Saks Fifth Avenue",
      "bergdorfgoodman.com": "Bergdorf Goodman",
      "modaoperandi.com": "Moda Operandi",
      "therealreal.com": "The RealReal",
      "vestiairecollective.com": "Vestiaire Collective",

      // Fast Fashion
      "zara.com": "Zara",
      "hm.com": "H&M",
      "mango.com": "Mango",
      "stories.com": "& Other Stories",
      "cosstores.com": "COS",
      "asos.com": "ASOS",
      "revolve.com": "Revolve",
      "shein.com": "SHEIN",
      "prettylittlething.com": "PrettyLittleThing",
      "boohoo.com": "Boohoo",
      "nastygal.com": "Nasty Gal",
      "forever21.com": "Forever 21",
      "uniqlo.com": "UNIQLO",
      "urbanoutfitters.com": "Urban Outfitters",

      // Department Stores
      "nordstrom.com": "Nordstrom",
      "bloomingdales.com": "Bloomingdale's",
      "macys.com": "Macy's",
      "kohls.com": "Kohl's",
      "dillards.com": "Dillard's",
      "jcpenney.com": "JCPenney",

      // Mid-range Fashion
      "anthropologie.com": "Anthropologie",
      "freepeople.com": "Free People",
      "jcrew.com": "J.Crew",
      "bananarepublic.com": "Banana Republic",
      "gap.com": "Gap",
      "oldnavy.com": "Old Navy",
      "abercrombie.com": "Abercrombie & Fitch",
      "hollisterco.com": "Hollister",
      "express.com": "Express",
      "loft.com": "LOFT",
      "anntaylor.com": "Ann Taylor",
      "whitehouseblackmarket.com": "White House Black Market",
      "chicos.com": "Chico's",
      "shopbop.com": "Shopbop",

      // Footwear
      "nike.com": "Nike",
      "adidas.com": "Adidas",
      "zappos.com": "Zappos",
      "dsw.com": "DSW",
      "stevemadden.com": "Steve Madden",
      "footlocker.com": "Foot Locker",
      "newbalance.com": "New Balance",
      "puma.com": "Puma",
      "reebok.com": "Reebok",
      "vans.com": "Vans",
      "converse.com": "Converse",
      "allbirds.com": "Allbirds",

      // Beauty
      "sephora.com": "Sephora",
      "ulta.com": "Ulta",
      "glossier.com": "Glossier",
      "cultbeauty.co.uk": "Cult Beauty",
      "beautylish.com": "Beautylish",
      "dermstore.com": "Dermstore",
      "spacenk.com": "Space NK",
      "bluemercury.com": "Bluemercury",
      "fentybeauty.com": "Fenty Beauty",
      "charlottetilbury.com": "Charlotte Tilbury",
      "patmcgrath.com": "Pat McGrath Labs",
      "kiehls.com": "Kiehl's",
      "larosche-posay.com": "La Roche-Posay",

      // Home
      "wayfair.com": "Wayfair",
      "homedepot.com": "Home Depot",
      "lowes.com": "Lowe's",
      "potterybarn.com": "Pottery Barn",
      "westelm.com": "West Elm",
      "cb2.com": "CB2",
      "crateandbarrel.com": "Crate & Barrel",
      "restorationhardware.com": "RH",
      "williams-sonoma.com": "Williams Sonoma",
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

  // Image - multiple selectors for Walmart
  const heroImage = $('[data-testid="hero-image"] img').attr("src");
  const mainImage = $(".hover-zoom-hero-image img").attr("src");
  const productImg = $('[data-testid="product-image"] img').attr("src");
  const galleryImg = $('[data-testid="media-thumbnail"] img').first().attr("src");
  result.imageUrl = heroImage || mainImage || productImg || galleryImg || null;

  // Price - multiple selectors for Walmart
  const priceEl = $('[itemprop="price"]').attr("content");
  const priceDisplay = $('[data-automation="buybox-product-price"]').text().trim();
  const priceSpan = $('[data-testid="price-wrap"] span').first().text().trim();
  const currentPrice = $(".price-current").text().trim();
  result.price = parsePrice(priceEl || priceDisplay || priceSpan || currentPrice);

  return result;
}

// Etsy-specific extraction
function extractEtsy($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  // Title - Etsy uses h1 and data attributes
  const listingTitle = $('[data-listing-id] h1').text().trim();
  const h1Title = $("h1").first().text().trim();
  result.title = listingTitle || h1Title || null;

  // Image - Etsy uses carousel and specific image containers
  const listingImage = $('[data-listing-card-image] img').attr("src");
  const carouselImg = $('[data-carousel-image] img').attr("src");
  const galleryImg = $('.listing-page-image-container img').first().attr("src");
  const mainImg = $('img[data-src]').first().attr("data-src");
  result.imageUrl = listingImage || carouselImg || galleryImg || mainImg || null;

  // Price - Etsy uses specific price containers
  const priceEl = $('[data-buy-box-price]').text().trim();
  const priceValue = $('[data-appears-component-name="price"] p').first().text().trim();
  const salePrice = $('[data-selector="sale-price"]').text().trim();
  result.price = parsePrice(priceEl || priceValue || salePrice);

  return result;
}

// Best Buy specific extraction
function extractBestBuy($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  // Title
  const productTitle = $('[data-testid="product-title"]').text().trim();
  const h1Title = $(".sku-title h1").text().trim();
  result.title = productTitle || h1Title || null;

  // Image
  const mainImage = $('[data-testid="primary-media-image"]').attr("src");
  const productImg = $(".primary-image img").attr("src");
  result.imageUrl = mainImage || productImg || null;

  // Price
  const priceEl = $('[data-testid="customer-price"] span').first().text().trim();
  const priceBox = $(".priceView-customer-price span").first().text().trim();
  result.price = parsePrice(priceEl || priceBox);

  return result;
}

// Nordstrom specific extraction
function extractNordstrom($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};

  // Title
  const productTitle = $('[data-element="product-title"]').text().trim();
  const h1Title = $("h1").first().text().trim();
  result.title = productTitle || h1Title || null;

  // Image
  const mainImage = $('[data-element="hero-image"] img').attr("src");
  const productImg = $(".product-image img").first().attr("src");
  result.imageUrl = mainImage || productImg || null;

  // Price
  const priceEl = $('[data-element="price"]').text().trim();
  const salePrice = $('[data-element="sale-price"]').text().trim();
  result.price = parsePrice(salePrice || priceEl);

  return result;
}

// ==========================================
// LUXURY FASHION RETAILERS
// ==========================================

// Net-A-Porter extraction
function extractNetAPorter($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-pid] h1').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".ProductImage img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim();
  const regularPrice = $('[data-testid="price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Farfetch extraction
function extractFarfetch($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-tstid="productName"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-tstid="productImage"] img').attr("src") || $(".ProductImages img").first().attr("src") || null;
  const priceEl = $('[data-tstid="priceInfo-original"]').text().trim() || $('[data-tstid="priceInfo-sale"]').text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// SSENSE extraction
function extractSSENSE($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="pdp-image"] img').attr("src") || $(".pdp-image img").first().attr("src") || null;
  const salePrice = $('[data-testid="product-sale-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Mytheresa extraction
function extractMytheresa($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $(".product-name h1").text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $(".product-image img").first().attr("src") || $('[data-testid="product-image"] img').attr("src") || null;
  const priceEl = $(".price-box .price").first().text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// Saks Fifth Avenue extraction
function extractSaks($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-at="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-at="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const salePrice = $('[data-at="sale-price"]').text().trim();
  const regularPrice = $('[data-at="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Neiman Marcus extraction
function extractNeimanMarcus($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-test="product-name"]').text().trim() || $(".product-title h1").text().trim() || null;
  result.imageUrl = $('[data-test="product-image"] img').attr("src") || $(".product-media img").first().attr("src") || null;
  const priceEl = $('[data-test="product-price"]').text().trim() || $(".product-price").text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// Moda Operandi extraction
function extractModaOperandi($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-title"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || null;
  const priceEl = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// ==========================================
// FAST FASHION RETAILERS
// ==========================================

// Zara extraction (often uses dynamic content, rely on meta tags)
function extractZara($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  // Zara uses heavy JS, rely on og: tags and JSON-LD
  result.title = $('[data-name="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('picture source').first().attr("srcset")?.split(" ")[0] || $(".media-image img").first().attr("src") || null;
  const priceEl = $('[data-qa="buy-module-price"]').text().trim() || $(".price__amount").text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// H&M extraction
function extractHM($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $(".ProductName h1").text().trim() || $('[data-testid="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".ProductImage img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim() || $(".sale-price").text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim() || $(".regular-price").text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// ASOS extraction
function extractASOS($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-title"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="main-image"] img').attr("src") || $(".gallery-image img").first().attr("src") || null;
  const salePrice = $('[data-testid="current-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Revolve extraction
function extractRevolve($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-qa="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-qa="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const salePrice = $('[data-qa="sale-price"]').text().trim();
  const regularPrice = $('[data-qa="price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// SHEIN extraction
function extractShein($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $(".product-intro__head-name").text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $(".product-intro__main-img img").attr("src") || $(".crop-image-container img").first().attr("src") || null;
  const priceEl = $(".product-intro__head-price .from").text().trim() || $(".product-intro__head-price").text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// UNIQLO extraction
function extractUniqlo($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-test="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-test="product-image"] img').attr("src") || $(".ProductImage img").first().attr("src") || null;
  const priceEl = $('[data-test="product-price"]').text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// Mango extraction
function extractMango($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".ProductImage img").first().attr("src") || null;
  const priceEl = $('[data-testid="product-price"]').text().trim() || $(".product-price").text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// ==========================================
// MID-RANGE FASHION RETAILERS
// ==========================================

// Anthropologie extraction
function extractAnthropologie($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-title"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Free People extraction
function extractFreePeople($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-title"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Urban Outfitters extraction
function extractUrbanOutfitters($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-qa="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-qa="product-image"] img').attr("src") || $(".c-pwa-image-viewer img").first().attr("src") || null;
  const salePrice = $('[data-qa="sale-price"]').text().trim();
  const regularPrice = $('[data-qa="price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// J.Crew extraction
function extractJCrew($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-name"]').text().trim() || $(".product-name h1").text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim() || $(".sales-price").text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Gap/Banana Republic/Old Navy (similar structure)
function extractGapBrands($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-title"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".product__image img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Bloomingdale's extraction
function extractBloomingdales($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-auto="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-auto="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const salePrice = $('[data-auto="sale-price"]').text().trim();
  const regularPrice = $('[data-auto="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Macy's extraction
function extractMacys($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-auto="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-auto="main-image"] img').attr("src") || $(".main-image img").first().attr("src") || null;
  const salePrice = $('[data-auto="sale-price"]').text().trim();
  const regularPrice = $('[data-auto="regular-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// ==========================================
// FOOTWEAR RETAILERS
// ==========================================

// Nike extraction
function extractNike($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-test="product-title"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-test="hero-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const priceEl = $('[data-test="product-price"]').text().trim() || $(".product-price").text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// Adidas extraction
function extractAdidas($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-title"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".gallery-image img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Zappos extraction
function extractZappos($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[itemprop="name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[itemprop="image"]').attr("src") || $(".product-image img").first().attr("src") || null;
  const priceEl = $('[itemprop="price"]').attr("content") || $(".price").first().text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// DSW extraction
function extractDSW($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Foot Locker extraction
function extractFootLocker($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-test="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-test="product-image"] img').attr("src") || $(".ProductImage img").first().attr("src") || null;
  const priceEl = $('[data-test="product-price"]').text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// ==========================================
// BEAUTY RETAILERS
// ==========================================

// Sephora extraction
function extractSephora($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-at="product-name"]').text().trim() || $('[data-testid="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-at="product-image"] img').attr("src") || $('[data-testid="product-image"] img').attr("src") || null;
  const priceEl = $('[data-at="product-price"]').text().trim() || $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// Ulta extraction
function extractUlta($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-title"]').text().trim() || $(".ProductMainSection h1").text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".ProductImage img").first().attr("src") || null;
  const salePrice = $('[data-testid="sale-price"]').text().trim();
  const regularPrice = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(salePrice || regularPrice);
  return result;
}

// Glossier extraction
function extractGlossier($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-name"]').text().trim() || $("h1").first().text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const priceEl = $('[data-testid="product-price"]').text().trim();
  result.price = parsePrice(priceEl);
  return result;
}

// Charlotte Tilbury extraction
function extractCharlotteTilbury($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const result: Partial<ScrapedProduct> = {};
  result.title = $('[data-testid="product-name"]').text().trim() || $(".product-name h1").text().trim() || null;
  result.imageUrl = $('[data-testid="product-image"] img').attr("src") || $(".product-image img").first().attr("src") || null;
  const priceEl = $('[data-testid="product-price"]').text().trim() || $(".product-price").text().trim();
  result.price = parsePrice(priceEl);
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

  // Marketplaces
  if (hostname.includes("amazon")) return "amazon";
  if (hostname.includes("target")) return "target";
  if (hostname.includes("walmart")) return "walmart";
  if (hostname.includes("etsy")) return "etsy";
  if (hostname.includes("bestbuy")) return "bestbuy";

  // Luxury Fashion
  if (hostname.includes("net-a-porter")) return "netaporter";
  if (hostname.includes("farfetch")) return "farfetch";
  if (hostname.includes("ssense")) return "ssense";
  if (hostname.includes("mytheresa")) return "mytheresa";
  if (hostname.includes("matchesfashion")) return "matchesfashion";
  if (hostname.includes("saksfifthavenue") || hostname.includes("saks.com")) return "saks";
  if (hostname.includes("neimanmarcus")) return "neimanmarcus";
  if (hostname.includes("bergdorfgoodman")) return "bergdorf";
  if (hostname.includes("modaoperandi")) return "modaoperandi";

  // Fast Fashion
  if (hostname.includes("zara")) return "zara";
  if (hostname.includes("hm.com") || hostname.includes("h&m")) return "hm";
  if (hostname.includes("asos")) return "asos";
  if (hostname.includes("revolve")) return "revolve";
  if (hostname.includes("shein")) return "shein";
  if (hostname.includes("uniqlo")) return "uniqlo";
  if (hostname.includes("mango")) return "mango";

  // Mid-range Fashion
  if (hostname.includes("nordstrom")) return "nordstrom";
  if (hostname.includes("bloomingdales")) return "bloomingdales";
  if (hostname.includes("macys")) return "macys";
  if (hostname.includes("anthropologie")) return "anthropologie";
  if (hostname.includes("freepeople")) return "freepeople";
  if (hostname.includes("urbanoutfitters")) return "urbanoutfitters";
  if (hostname.includes("jcrew")) return "jcrew";
  if (hostname.includes("gap.com") || hostname.includes("bananarepublic") || hostname.includes("oldnavy")) return "gapbrands";

  // Footwear
  if (hostname.includes("nike.com")) return "nike";
  if (hostname.includes("adidas")) return "adidas";
  if (hostname.includes("zappos")) return "zappos";
  if (hostname.includes("dsw")) return "dsw";
  if (hostname.includes("footlocker")) return "footlocker";

  // Beauty
  if (hostname.includes("sephora")) return "sephora";
  if (hostname.includes("ulta")) return "ulta";
  if (hostname.includes("glossier")) return "glossier";
  if (hostname.includes("charlottetilbury")) return "charlottetilbury";

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
      // Marketplaces
      case "amazon":
        retailerData = extractAmazon($);
        break;
      case "target":
        retailerData = extractTarget($);
        break;
      case "walmart":
        retailerData = extractWalmart($);
        break;
      case "etsy":
        retailerData = extractEtsy($);
        break;
      case "bestbuy":
        retailerData = extractBestBuy($);
        break;

      // Luxury Fashion
      case "netaporter":
        retailerData = extractNetAPorter($);
        break;
      case "farfetch":
        retailerData = extractFarfetch($);
        break;
      case "ssense":
        retailerData = extractSSENSE($);
        break;
      case "mytheresa":
        retailerData = extractMytheresa($);
        break;
      case "saks":
        retailerData = extractSaks($);
        break;
      case "neimanmarcus":
        retailerData = extractNeimanMarcus($);
        break;
      case "modaoperandi":
        retailerData = extractModaOperandi($);
        break;

      // Fast Fashion
      case "zara":
        retailerData = extractZara($);
        break;
      case "hm":
        retailerData = extractHM($);
        break;
      case "asos":
        retailerData = extractASOS($);
        break;
      case "revolve":
        retailerData = extractRevolve($);
        break;
      case "shein":
        retailerData = extractShein($);
        break;
      case "uniqlo":
        retailerData = extractUniqlo($);
        break;
      case "mango":
        retailerData = extractMango($);
        break;

      // Mid-range Fashion
      case "nordstrom":
        retailerData = extractNordstrom($);
        break;
      case "bloomingdales":
        retailerData = extractBloomingdales($);
        break;
      case "macys":
        retailerData = extractMacys($);
        break;
      case "anthropologie":
        retailerData = extractAnthropologie($);
        break;
      case "freepeople":
        retailerData = extractFreePeople($);
        break;
      case "urbanoutfitters":
        retailerData = extractUrbanOutfitters($);
        break;
      case "jcrew":
        retailerData = extractJCrew($);
        break;
      case "gapbrands":
        retailerData = extractGapBrands($);
        break;

      // Footwear
      case "nike":
        retailerData = extractNike($);
        break;
      case "adidas":
        retailerData = extractAdidas($);
        break;
      case "zappos":
        retailerData = extractZappos($);
        break;
      case "dsw":
        retailerData = extractDSW($);
        break;
      case "footlocker":
        retailerData = extractFootLocker($);
        break;

      // Beauty
      case "sephora":
        retailerData = extractSephora($);
        break;
      case "ulta":
        retailerData = extractUlta($);
        break;
      case "glossier":
        retailerData = extractGlossier($);
        break;
      case "charlottetilbury":
        retailerData = extractCharlotteTilbury($);
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

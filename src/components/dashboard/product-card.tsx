"use client";

import Image from "next/image";
import { ExternalLink, Check, TrendingDown, TrendingUp, Bell } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    url: string;
    title: string;
    retailer: string;
    currentPrice: number | string;
    originalPrice?: number;
    imageUrl?: string | null;
    isPurchased?: boolean;
    lastChecked?: string | null;
    notifyOnPriceDrop?: boolean;
  };
  showPurchasedBadge?: boolean;
  onClick?: () => void;
}

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProductCard({ product, showPurchasedBadge, onClick }: ProductCardProps) {
  const price = typeof product.currentPrice === "string"
    ? parseFloat(product.currentPrice)
    : product.currentPrice;

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  // Calculate price change percentage
  const originalPrice = product.originalPrice || price;
  const priceDiff = price - originalPrice;
  const priceChangePercent = originalPrice > 0
    ? Math.round((priceDiff / originalPrice) * 100)
    : 0;

  // Only show price change badge if there's a significant change and checked in last 7 days
  const lastCheckedDate = product.lastChecked ? new Date(product.lastChecked) : null;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const showPriceChange = priceChangePercent !== 0 && lastCheckedDate && lastCheckedDate > sevenDaysAgo;

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`group block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        showPurchasedBadge && product.isPurchased ? "opacity-80" : ""
      }`}
    >
      {/* Product Image */}
      <div className="relative aspect-[4/5] bg-[#F8F8F6] rounded-t-lg overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FEF7F7] to-[#FAE5E5]">
            <div className="w-16 h-16 rounded-full bg-white/70 flex items-center justify-center shadow-sm">
              <span className="text-3xl font-medium text-[#F4C2C2]">
                {product.title.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Purchased badge */}
        {showPurchasedBadge && product.isPurchased && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-[#B5C4B1] text-white text-xs font-medium rounded-full">
            <Check className="w-3 h-3" />
            Purchased
          </div>
        )}

        {/* Price change badge */}
        {showPriceChange && (
          <div
            className={`absolute top-2 right-2 flex items-center gap-0.5 px-2 py-1 text-white text-xs font-bold rounded-full ${
              priceChangePercent < 0 ? "bg-[#B5C4B1]" : "bg-[#D4A5A5]"
            }`}
          >
            {priceChangePercent < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3" />
            )}
            {priceChangePercent > 0 ? "+" : ""}{priceChangePercent}%
          </div>
        )}

        {/* External link indicator - only show if no price badge or on hover */}
        {!showPriceChange && (
          <div className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
          </div>
        )}

        {/* Bell icon for price alerts */}
        {product.notifyOnPriceDrop && (
          <div
            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-[#B5C4B1] shadow-sm"
            title="Price alerts on"
          >
            <Bell className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-sm font-medium text-[#2C2C2C] line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Price and Retailer */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-[#2C2C2C]">{formattedPrice}</p>
            {/* Last checked timestamp */}
            {product.lastChecked && (
              <p className="text-xs text-gray-400">
                Checked {formatRelativeTime(product.lastChecked)}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500">{product.retailer}</p>
        </div>
      </div>
    </a>
  );
}

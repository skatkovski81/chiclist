"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { ProductGrid } from "./product-grid";
import { StatsRow } from "./stats-row";
import { EmptyState } from "./empty-state";
import { useSearch } from "./dashboard-layout";

type SortOption = "recent" | "price-asc" | "price-desc" | "name-asc";

interface Product {
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
  createdAt?: string;
}

interface FilterableProductsProps {
  products: Product[];
  title: string;
  showPurchasedBadge?: boolean;
  emptyState: React.ReactNode;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently Added" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name A-Z" },
];

export function FilterableProducts({
  products,
  title,
  showPurchasedBadge,
  emptyState,
}: FilterableProductsProps) {
  const { debouncedQuery: searchQuery } = useSearch();
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (product) =>
          product.title.toLowerCase().includes(query) ||
          product.retailer.toLowerCase().includes(query)
      );
    }

    // Sort products
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => {
          const priceA = typeof a.currentPrice === "string" ? parseFloat(a.currentPrice) : a.currentPrice;
          const priceB = typeof b.currentPrice === "string" ? parseFloat(b.currentPrice) : b.currentPrice;
          return priceA - priceB;
        });
        break;
      case "price-desc":
        result.sort((a, b) => {
          const priceA = typeof a.currentPrice === "string" ? parseFloat(a.currentPrice) : a.currentPrice;
          const priceB = typeof b.currentPrice === "string" ? parseFloat(b.currentPrice) : b.currentPrice;
          return priceB - priceA;
        });
        break;
      case "name-asc":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "recent":
      default:
        // Products are already sorted by createdAt from the server
        break;
    }

    return result;
  }, [products, searchQuery, sortBy]);

  // Calculate stats for filtered products
  const totalValue = useMemo(() => {
    return filteredProducts.reduce((sum, p) => {
      const price = typeof p.currentPrice === "string" ? parseFloat(p.currentPrice) : p.currentPrice;
      return sum + price;
    }, 0);
  }, [filteredProducts]);

  const isFiltered = searchQuery.trim().length > 0;
  const hasNoResults = isFiltered && filteredProducts.length === 0;
  const hasProducts = products.length > 0;

  return (
    <>
      {/* Page Header with Title and Sort */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#2C2C2C]">{title}</h1>

          {hasProducts && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-[#2C2C2C] cursor-pointer hover:border-[#F4C2C2] focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        <StatsRow
          totalItems={filteredProducts.length}
          totalValue={totalValue}
          isFiltered={isFiltered}
        />
      </div>

      {/* Product Grid or Empty State */}
      <div className="mt-8">
        {!hasProducts ? (
          emptyState
        ) : hasNoResults ? (
          <EmptyState
            icon={<Search className="w-10 h-10 text-gray-300" />}
            title="No results found"
            description={`No products match "${searchQuery}". Try a different search term.`}
          />
        ) : (
          <ProductGrid products={filteredProducts} showPurchasedBadge={showPurchasedBadge} />
        )}
      </div>
    </>
  );
}

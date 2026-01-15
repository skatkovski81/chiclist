"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatsRow } from "./stats-row";
import { ProductsEmptyState } from "./empty-state";
import { ProductGrid } from "./product-grid";
import { AddProductModal } from "./add-product-modal";

interface Product {
  id: string;
  url: string;
  title: string;
  retailer: string;
  currentPrice: number | string;
  imageUrl?: string | null;
}

interface DashboardContentProps {
  products: Product[];
  totalItems: number;
  totalValue: number;
  isModalOpen: boolean;
  onModalClose: () => void;
}

export function DashboardContent({
  products,
  totalItems,
  totalValue,
  isModalOpen,
  onModalClose,
}: DashboardContentProps) {
  const router = useRouter();

  const handleProductAdded = useCallback(() => {
    // Refresh the page data
    router.refresh();
  }, [router]);

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2C2C2C] mb-4">All Items</h1>
        <StatsRow totalItems={totalItems} totalValue={totalValue} />
      </div>

      {/* Product Grid or Empty State */}
      <div className="mt-8">
        {products.length === 0 ? (
          <ProductsEmptyState />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        onSuccess={handleProductAdded}
      />
    </>
  );
}

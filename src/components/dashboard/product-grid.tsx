"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "./product-card";
import { ProductDetailModal } from "./product-detail-modal";

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
}

interface ProductGridProps {
  products: Product[];
  showPurchasedBadge?: boolean;
}

export function ProductGrid({ products, showPurchasedBadge }: ProductGridProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const router = useRouter();

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
  };

  const handleModalClose = () => {
    setSelectedProductId(null);
  };

  const handleProductUpdate = () => {
    router.refresh();
  };

  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showPurchasedBadge={showPurchasedBadge}
            onClick={() => handleProductClick(product.id)}
          />
        ))}
      </div>

      <ProductDetailModal
        productId={selectedProductId}
        isOpen={selectedProductId !== null}
        onClose={handleModalClose}
        onUpdate={handleProductUpdate}
      />
    </>
  );
}

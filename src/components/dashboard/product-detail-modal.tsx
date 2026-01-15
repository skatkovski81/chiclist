"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ExternalLink, Loader2, Check, Trash2, ShoppingBag, ChevronDown, FolderOpen, RefreshCw, TrendingDown, TrendingUp, History, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

interface ProductDetailModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface List {
  id: string;
  name: string;
  emoji?: string | null;
}

interface PriceHistoryEntry {
  price: number;
  checkedAt: string;
}

interface ProductDetails {
  id: string;
  url: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
  retailer: string;
  notes: string | null;
  isPurchased: boolean;
  purchasedAt: string | null;
  targetPrice: number | null;
  notifyOnPriceDrop: boolean;
  savedProductId: string;
  createdAt: string;
  listId: string | null;
  list: List | null;
  priceHistory: PriceHistoryEntry[];
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
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Format date for price history
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ProductDetailModal({
  productId,
  isOpen,
  onClose,
  onUpdate,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMovingList, setIsMovingList] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesTimeout, setNotesTimeout] = useState<NodeJS.Timeout | null>(null);
  const [notifyOnPriceDrop, setNotifyOnPriceDrop] = useState(false);
  const [targetPriceInput, setTargetPriceInput] = useState("");
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Fetch product details and lists
  const fetchProduct = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    try {
      const [productResponse, listsResponse] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch("/api/lists"),
      ]);

      if (!productResponse.ok) throw new Error("Failed to fetch product");

      const productData = await productResponse.json();
      setProduct(productData);
      setNotes(productData.notes || "");
      setNotifyOnPriceDrop(productData.notifyOnPriceDrop || false);
      setTargetPriceInput(productData.targetPrice ? String(productData.targetPrice) : "");

      if (listsResponse.ok) {
        const listsData = await listsResponse.json();
        setLists(listsData);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product details");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen && productId) {
      fetchProduct();
    }
  }, [isOpen, productId, fetchProduct]);

  // Move to list
  const handleMoveToList = async (newListId: string | null) => {
    if (!productId || !product) return;

    setIsMovingList(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: newListId }),
      });

      if (!response.ok) throw new Error("Failed to move product");

      const data = await response.json();
      const newList = newListId ? lists.find((l) => l.id === newListId) || null : null;
      setProduct((prev) => (prev ? { ...prev, listId: data.listId, list: newList } : null));

      toast.success(newListId ? "Moved to list" : "Removed from list");
      onUpdate();
    } catch (error) {
      console.error("Error moving product:", error);
      toast.error("Failed to move product");
    } finally {
      setIsMovingList(false);
    }
  };

  // Refresh price
  const handleRefreshPrice = async () => {
    if (!productId || !product) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/products/${productId}/refresh-price`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to refresh price");
        return;
      }

      if (data.newPrice === null) {
        toast.info("Could not fetch price from website");
        return;
      }

      // Update the product with new price
      if (data.changed) {
        setProduct((prev) =>
          prev ? { ...prev, currentPrice: data.newPrice } : null
        );

        // Show appropriate toast based on price change
        const formatPrice = (p: number) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency || "USD" }).format(p);

        if (data.changeType === "dropped") {
          const savings = data.oldPrice - data.newPrice;

          // Check if below target price
          if (data.isBelowTarget) {
            toast.success(
              `🎯 Below your target price! ${formatPrice(data.oldPrice)} → ${formatPrice(data.newPrice)} (Save ${formatPrice(savings)}!)`,
              {
                duration: 7000,
                style: { background: '#B5C4B1', color: 'white' }
              }
            );
          } else {
            toast.success(
              `🎉 Price dropped! ${formatPrice(data.oldPrice)} → ${formatPrice(data.newPrice)} (Save ${formatPrice(savings)}!)`,
              {
                duration: 5000,
                style: { background: '#B5C4B1', color: 'white' }
              }
            );
          }
        } else {
          toast.error(
            `Price increased from ${formatPrice(data.oldPrice)} to ${formatPrice(data.newPrice)}`,
            { duration: 5000 }
          );
        }
      } else {
        toast.success("Price is up to date!");
      }

      // Refresh the product data to get updated price history
      fetchProduct();
      onUpdate();
    } catch (error) {
      console.error("Error refreshing price:", error);
      toast.error("Failed to refresh price");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-save notes with debounce
  const handleNotesChange = (value: string) => {
    setNotes(value);

    if (notesTimeout) {
      clearTimeout(notesTimeout);
    }

    const timeout = setTimeout(async () => {
      if (!productId) return;

      try {
        const response = await fetch(`/api/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });

        if (!response.ok) throw new Error("Failed to save notes");
        toast.success("Notes saved");
      } catch (error) {
        console.error("Error saving notes:", error);
        toast.error("Failed to save notes");
      }
    }, 1000);

    setNotesTimeout(timeout);
  };

  // Update notification preferences
  const handleNotificationToggle = async (enabled: boolean) => {
    if (!product?.savedProductId) return;

    setNotifyOnPriceDrop(enabled);
    setIsSavingNotifications(true);

    try {
      const response = await fetch(
        `/api/saved-products/${product.savedProductId}/notifications`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifyOnPriceDrop: enabled }),
        }
      );

      if (!response.ok) throw new Error("Failed to update notifications");

      toast.success(
        enabled ? "Price alerts enabled" : "Price alerts disabled"
      );
      onUpdate();
    } catch (error) {
      console.error("Error updating notifications:", error);
      setNotifyOnPriceDrop(!enabled); // Revert on error
      toast.error("Failed to update notification settings");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Update target price
  const handleTargetPriceChange = async (value: string) => {
    setTargetPriceInput(value);

    if (!product?.savedProductId) return;

    // Debounce the save
    if (notesTimeout) {
      clearTimeout(notesTimeout);
    }

    const timeout = setTimeout(async () => {
      setIsSavingNotifications(true);
      try {
        const numValue = value ? parseFloat(value) : null;
        const response = await fetch(
          `/api/saved-products/${product.savedProductId}/notifications`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetPrice: numValue }),
          }
        );

        if (!response.ok) throw new Error("Failed to update target price");

        if (numValue) {
          toast.success(`Target price set to $${numValue.toFixed(2)}`);
        } else {
          toast.success("Target price cleared");
        }
        onUpdate();
      } catch (error) {
        console.error("Error updating target price:", error);
        toast.error("Failed to save target price");
      } finally {
        setIsSavingNotifications(false);
      }
    }, 1000);

    setNotesTimeout(timeout);
  };

  // Toggle purchased status
  const handleTogglePurchased = async () => {
    if (!productId || !product) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: !product.isPurchased }),
      });

      if (!response.ok) throw new Error("Failed to update product");

      const data = await response.json();
      setProduct((prev) =>
        prev ? { ...prev, isPurchased: data.isPurchased, purchasedAt: data.purchasedAt } : null
      );

      toast.success(data.isPurchased ? "Marked as purchased!" : "Unmarked as purchased");
      onUpdate();
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete product
  const handleDelete = async () => {
    if (!productId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete product");

      toast.success("Product deleted");
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !showDeleteConfirm) {
      onClose();
    }
  };

  const handleClose = () => {
    if (notesTimeout) {
      clearTimeout(notesTimeout);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  const formattedPrice = product?.currentPrice
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: product.currency || "USD",
      }).format(product.currentPrice)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#2C2C2C]">Product Details</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#F4C2C2]" />
            </div>
          ) : product ? (
            <div className="space-y-6">
              {/* Image */}
              <div className="relative aspect-square w-full max-w-[300px] mx-auto bg-[#F8F8F6] rounded-lg overflow-hidden">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-contain p-4"
                    sizes="300px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FEF7F7] to-[#FAE5E5]">
                    <div className="w-20 h-20 rounded-full bg-white/70 flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-[#F4C2C2]" />
                    </div>
                  </div>
                )}

                {/* Purchased badge */}
                {product.isPurchased && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-[#B5C4B1] text-white text-xs font-medium rounded-full">
                    <Check className="w-3 h-3" />
                    Purchased
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-[#2C2C2C] leading-tight">
                {product.title}
              </h3>

              {/* Price and Retailer */}
              <div className="flex items-end justify-between">
                <div>
                  {formattedPrice ? (
                    <p className="text-2xl font-bold text-[#2C2C2C]">{formattedPrice}</p>
                  ) : (
                    <p className="text-lg text-gray-400">Price not available</p>
                  )}
                </div>
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#2C2C2C] transition-colors"
                >
                  {product.retailer}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Visit Store Button */}
              <div className="flex gap-3">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#2C2C2C] text-white rounded-lg font-medium hover:bg-[#3D3D3D] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Store
                </a>
                <button
                  onClick={handleRefreshPrice}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isRefreshing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isRefreshing ? "Checking..." : "Refresh Price"}
                </button>
              </div>

              {/* Price History */}
              {product.priceHistory && product.priceHistory.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-medium text-[#2C2C2C]">Price History</h4>
                  </div>

                  {/* Price trend summary */}
                  {product.priceHistory.length > 1 && (
                    <div className="mb-3">
                      {(() => {
                        const firstPrice = product.priceHistory[product.priceHistory.length - 1].price;
                        const currentPrice = product.priceHistory[0].price;
                        const diff = currentPrice - firstPrice;
                        const isLower = diff < 0;
                        const formatPrice = (p: number) =>
                          new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency || "USD" }).format(Math.abs(p));

                        if (diff !== 0) {
                          return (
                            <div className={`flex items-center gap-2 text-sm ${isLower ? "text-[#B5C4B1]" : "text-[#D4A5A5]"}`}>
                              {isLower ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                              <span>
                                {isLower ? "Dropped" : "Increased"} {formatPrice(diff)} since first tracked
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Price history list */}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {product.priceHistory.slice(0, 5).map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className={`font-medium ${index === 0 ? "text-[#2C2C2C]" : "text-gray-500"}`}>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: product.currency || "USD",
                          }).format(entry.price)}
                          {index === 0 && <span className="text-xs text-gray-400 ml-1">(current)</span>}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatDate(entry.checkedAt)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {product.priceHistory.length > 5 && (
                    <p className="text-xs text-gray-400 mt-2">
                      +{product.priceHistory.length - 5} more entries
                    </p>
                  )}
                </div>
              )}

              {/* Price Alerts */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-[#2C2C2C]">Price Alerts</h4>
                </div>

                {/* Notify toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-[#2C2C2C]">Notify me when price drops</p>
                    <p className="text-xs text-gray-400">Get alerted when this item goes on sale</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle(!notifyOnPriceDrop)}
                    disabled={isSavingNotifications}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      notifyOnPriceDrop ? "bg-[#B5C4B1]" : "bg-gray-200"
                    } ${isSavingNotifications ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        notifyOnPriceDrop ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Target Price */}
                <div>
                  <label className="block text-sm text-[#2C2C2C] mb-1.5">
                    Target price (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={targetPriceInput}
                      onChange={(e) => handleTargetPriceChange(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Get notified when price drops below this amount
                  </p>
                </div>
              </div>

              {/* Move to List */}
              {lists.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
                    <FolderOpen className="w-4 h-4 inline-block mr-1" />
                    List
                  </label>
                  <div className="relative">
                    <select
                      value={product.listId || ""}
                      onChange={(e) => handleMoveToList(e.target.value || null)}
                      disabled={isMovingList}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent appearance-none bg-white disabled:opacity-50"
                    >
                      <option value="">No list</option>
                      {lists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.emoji ? `${list.emoji} ` : ""}{list.name}
                        </option>
                      ))}
                    </select>
                    {isMovingList ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add personal notes about this product..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">Auto-saves as you type</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleTogglePurchased}
                  disabled={isSaving}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                    product.isPurchased
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-[#B5C4B1] text-white hover:bg-[#9DB397]"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {product.isPurchased ? "Unmark Purchased" : "Mark as Purchased"}
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#D4A5A5] text-[#D4A5A5] rounded-lg font-medium text-sm hover:bg-[#FEF7F7] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Product not found
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-[#2C2C2C] mb-2">
                Delete this product?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. The product will be removed from your list.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A5A5] text-white rounded-lg font-medium text-sm hover:bg-[#C48888] transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

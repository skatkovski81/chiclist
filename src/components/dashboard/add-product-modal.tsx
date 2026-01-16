"use client";

import { useState, useRef } from "react";
import { X, Loader2, Sparkles, AlertCircle, ChevronDown } from "lucide-react";

interface List {
  id: string;
  name: string;
  emoji?: string | null;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lists?: List[];
}

export function AddProductModal({ isOpen, onClose, onSuccess, lists = [] }: AddProductModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [listId, setListId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<"idle" | "success" | "partial" | "error">("idle");
  const [error, setError] = useState("");

  // Track the last scraped URL to avoid re-scraping
  const lastScrapedUrl = useRef<string>("");

  if (!isOpen) return null;

  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsed = new URL(urlString);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleUrlBlur = async () => {
    console.log("[AddProduct] URL blur triggered, url:", url);
    console.log("[AddProduct] lastScrapedUrl:", lastScrapedUrl.current);
    console.log("[AddProduct] isValidUrl:", isValidUrl(url));

    // Don't scrape if URL hasn't changed or is invalid
    if (!url || url === lastScrapedUrl.current || !isValidUrl(url)) {
      console.log("[AddProduct] Skipping scrape - url empty, already scraped, or invalid");
      return;
    }

    console.log("[AddProduct] Starting scrape for:", url);
    setIsScraping(true);
    setScrapeStatus("idle");
    lastScrapedUrl.current = url;

    try {
      const response = await fetch("/api/products/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      console.log("[AddProduct] Scrape response status:", response.status);

      if (!response.ok) {
        console.log("[AddProduct] Scrape failed with status:", response.status);
        setScrapeStatus("error");
        return;
      }

      const data = await response.json();
      console.log("[AddProduct] Scrape data:", data);

      // Auto-fill fields if we got data
      let fieldsFound = 0;

      if (data.title && !title) {
        setTitle(data.title);
        fieldsFound++;
      }

      if (data.price && !price) {
        setPrice(data.price.toString());
        fieldsFound++;
      }

      if (data.imageUrl && !imageUrl) {
        setImageUrl(data.imageUrl);
        fieldsFound++;
      }

      // Set status based on how much data we found
      if (fieldsFound >= 2) {
        setScrapeStatus("success");
      } else if (fieldsFound > 0) {
        setScrapeStatus("partial");
      } else {
        setScrapeStatus("error");
      }
    } catch (err) {
      console.error("Scrape error:", err);
      setScrapeStatus("error");
    } finally {
      setIsScraping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title,
          price: parseFloat(price),
          imageUrl: imageUrl || undefined,
          listId: listId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add product");
      }

      // Reset form
      setUrl("");
      setTitle("");
      setPrice("");
      setImageUrl("");
      setListId("");
      setScrapeStatus("idle");
      lastScrapedUrl.current = "";
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    // Reset form on close
    setUrl("");
    setTitle("");
    setPrice("");
    setImageUrl("");
    setListId("");
    setError("");
    setScrapeStatus("idle");
    lastScrapedUrl.current = "";
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#2C2C2C]">Add Product</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-[#2C2C2C] mb-1">
              Product URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://www.amazon.com/..."
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent"
              />
              {isScraping && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#F4C2C2]" />
                </div>
              )}
            </div>

            {/* Scrape status message */}
            {scrapeStatus !== "idle" && !isScraping && (
              <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${
                scrapeStatus === "success" ? "text-[#B5C4B1]" :
                scrapeStatus === "partial" ? "text-[#D4A574]" :
                "text-gray-400"
              }`}>
                {scrapeStatus === "success" && (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Product details auto-filled!</span>
                  </>
                )}
                {scrapeStatus === "partial" && (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Some details found. Please fill in the rest.</span>
                  </>
                )}
                {scrapeStatus === "error" && (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Couldn&apos;t fetch details. Please enter manually.</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[#2C2C2C] mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isScraping ? "Loading..." : "Product name"}
              disabled={isScraping}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-[#2C2C2C] mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={isScraping ? "Loading..." : "0.00"}
                disabled={isScraping}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-[#2C2C2C] mb-1">
              Image URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={isScraping ? "Loading..." : "https://..."}
              disabled={isScraping}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />

            {/* Image preview */}
            {imageUrl && isValidUrl(imageUrl) && (
              <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Product preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* List Selection */}
          {lists.length > 0 && (
            <div>
              <label htmlFor="list" className="block text-sm font-medium text-[#2C2C2C] mb-1">
                Add to List <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <select
                  id="list"
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent appearance-none bg-white"
                >
                  <option value="">No list</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.emoji ? `${list.emoji} ` : ""}{list.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading || isScraping}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isScraping}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#2C2C2C] bg-[#F4C2C2] rounded-lg hover:bg-[#EDB4B4] transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["👗", "👠", "💄", "🏠", "🎁", "💻", "📱", "⭐", "❤️", "🛍️", "👜", "💍", "🧥", "👔", "🎨"];

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateListModal({ isOpen, onClose, onSuccess }: CreateListModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🛍️");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create list");
      }

      toast.success("List created!");
      setName("");
      setEmoji("🛍️");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating list:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create list");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#2C2C2C]">Create New List</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* List Name */}
          <div>
            <label htmlFor="listName" className="block text-sm font-medium text-[#2C2C2C] mb-2">
              List Name
            </label>
            <input
              id="listName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Dresses, Gift Ideas..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              Choose an Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emojiOption) => (
                <button
                  key={emojiOption}
                  type="button"
                  onClick={() => setEmoji(emojiOption)}
                  className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all ${
                    emoji === emojiOption
                      ? "bg-[#FAE5E5] ring-2 ring-[#F4C2C2]"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {emojiOption}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2">
            <p className="text-sm text-gray-500 mb-2">Preview:</p>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-lg">{emoji}</span>
              <span className="text-sm font-medium text-[#2C2C2C]">
                {name.trim() || "Your list name"}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F4C2C2] text-[#2C2C2C] rounded-lg font-medium text-sm hover:bg-[#EDB4B4] transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create List"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

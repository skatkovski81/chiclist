import { ShoppingBag, Plus } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <div className="w-20 h-20 rounded-full bg-[#FEF7F7] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#2C2C2C] mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-6">{description}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 bg-[#F4C2C2] text-[#2C2C2C] px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-[#EDB4B4] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ProductsEmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <EmptyState
        icon={<ShoppingBag className="w-10 h-10 text-[#F4C2C2]" />}
        title="No products yet"
        description="Save your first product to start tracking prices and never miss a deal."
        actionLabel="Add Product"
      />
    </div>
  );
}

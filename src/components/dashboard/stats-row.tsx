import { Package, DollarSign } from "lucide-react";

interface StatsRowProps {
  totalItems: number;
  totalValue: number;
  currency?: string;
  isFiltered?: boolean;
}

export function StatsRow({ totalItems, totalValue, currency = "USD", isFiltered = false }: StatsRowProps) {
  const formattedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(totalValue);

  return (
    <div className="flex gap-4 flex-wrap">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-3 min-w-[160px]">
        <div className="w-10 h-10 rounded-lg bg-[#FEF7F7] flex items-center justify-center">
          <Package className="w-5 h-5 text-[#F4C2C2]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#2C2C2C]">{totalItems}</p>
          <p className="text-xs text-gray-500">{isFiltered ? "Results" : "Total Items"}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-3 min-w-[160px]">
        <div className="w-10 h-10 rounded-lg bg-[#F0F7F0] flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-[#B5C4B1]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#2C2C2C]">{formattedValue}</p>
          <p className="text-xs text-gray-500">Total Value</p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ShoppingBag, FolderHeart, TrendingDown, Bell, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-[#2C2C2C]">Chic</span>
          <span className="text-2xl font-bold text-[#F4C2C2]">List</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-[#2C2C2C] hover:text-[#F4C2C2] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-medium bg-[#F4C2C2] text-[#2C2C2C] rounded-lg hover:bg-[#EDB4B4] transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-5xl sm:text-6xl font-bold text-[#2C2C2C] tracking-tight">
            Your Chic <span className="text-[#F4C2C2]">Wishlist</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-xl mx-auto">
            Save products from anywhere, track prices, and never miss a deal.
            Shop smarter, not harder.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-lg font-medium bg-[#F4C2C2] text-[#2C2C2C] rounded-lg hover:bg-[#EDB4B4] transition-colors shadow-sm"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium bg-white text-[#2C2C2C] rounded-lg border border-gray-200 hover:border-[#F4C2C2] hover:bg-[#FEF7F7] transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#F4C2C2]/30 transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#FEF7F7] flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-[#F4C2C2]" />
            </div>
            <h3 className="font-semibold text-[#2C2C2C] mb-2">Save Products</h3>
            <p className="text-sm text-gray-500">
              Add items from any online store to your personal wishlist.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#F4C2C2]/30 transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#F0F7F0] flex items-center justify-center mb-4">
              <FolderHeart className="w-6 h-6 text-[#B5C4B1]" />
            </div>
            <h3 className="font-semibold text-[#2C2C2C] mb-2">Organize Lists</h3>
            <p className="text-sm text-gray-500">
              Create custom lists for different occasions or categories.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#F4C2C2]/30 transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#FEF7F7] flex items-center justify-center mb-4">
              <TrendingDown className="w-6 h-6 text-[#F4C2C2]" />
            </div>
            <h3 className="font-semibold text-[#2C2C2C] mb-2">Track Prices</h3>
            <p className="text-sm text-gray-500">
              Monitor price changes and see your savings at a glance.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#F4C2C2]/30 transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#F0F7F0] flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-[#B5C4B1]" />
            </div>
            <h3 className="font-semibold text-[#2C2C2C] mb-2">Price Alerts</h3>
            <p className="text-sm text-gray-500">
              Set target prices and get notified when items go on sale.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">Built by</span>
            <span className="text-sm font-medium text-[#2C2C2C]">VelocityLab</span>
          </div>
          <div className="flex items-center">
            <span className="text-lg font-bold text-[#2C2C2C]">Chic</span>
            <span className="text-lg font-bold text-[#F4C2C2]">List</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}

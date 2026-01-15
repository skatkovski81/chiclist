"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, Search, Plus, ChevronDown, Settings, LogOut, X } from "lucide-react";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  onMenuClick: () => void;
  onAddProductClick: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Navbar({ user, onMenuClick, onAddProductClick, searchQuery = "", onSearchChange }: NavbarProps) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold text-[#2C2C2C]">Chic</span>
            <span className="text-xl font-bold text-[#F4C2C2]">List</span>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="hidden sm:block flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange?.("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Add Product + User */}
        <div className="flex items-center gap-3">
          <button
            onClick={onAddProductClick}
            className="hidden sm:flex items-center gap-2 bg-[#F4C2C2] text-[#2C2C2C] px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#EDB4B4] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={onAddProductClick}
            className="sm:hidden p-2 bg-[#F4C2C2] text-[#2C2C2C] rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* User Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#FAE5E5] flex items-center justify-center text-sm font-medium text-[#2C2C2C]">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-[#2C2C2C]">
                {user.name || user.email?.split("@")[0]}
              </span>
              <ChevronDown className="hidden md:block w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-[#2C2C2C]">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

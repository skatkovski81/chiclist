"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { AddProductModal } from "./add-product-modal";
import { CreateListModal } from "./create-list-modal";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

// Search context for sharing search state
interface SearchContextType {
  searchQuery: string;
  debouncedQuery: string;
}

const SearchContext = createContext<SearchContextType>({ searchQuery: "", debouncedQuery: "" });

export function useSearch() {
  return useContext(SearchContext);
}

interface DashboardLayoutProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  lists?: Array<{ id: string; name: string; emoji?: string | null; _count?: { savedProducts: number } }>;
  itemCounts?: {
    all: number;
    purchased: number;
  };
  children: React.ReactNode;
}

export function DashboardLayout({
  user,
  lists = [],
  itemCounts = { all: 0, purchased: 0 },
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleProductAdded = () => {
    router.refresh();
  };

  const handleListCreated = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Fixed Navbar - top, full width, h-16 */}
      <Navbar
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        onAddProductClick={() => setIsAddProductModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Desktop Sidebar - fixed left, w-64, below navbar */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-gray-200 bg-white hidden md:block overflow-y-auto">
        <Sidebar
          lists={lists}
          itemCounts={itemCounts}
          onCreateListClick={() => setIsCreateListModalOpen(true)}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-xl">
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
              <div className="flex items-center">
                <span className="text-xl font-bold text-[#2C2C2C]">Chic</span>
                <span className="text-xl font-bold text-[#F4C2C2]">List</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              lists={lists}
              itemCounts={itemCounts}
              onCreateListClick={() => {
                setSidebarOpen(false);
                setIsCreateListModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content - ml-64 on desktop, mt-16 always, p-6 */}
      <main className="pt-16 md:ml-64">
        <div className="p-6">
          <SearchContext.Provider value={{ searchQuery, debouncedQuery }}>
            {children}
          </SearchContext.Provider>
        </div>
      </main>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSuccess={handleProductAdded}
        lists={lists}
      />

      {/* Create List Modal */}
      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onSuccess={handleListCreated}
      />
    </div>
  );
}

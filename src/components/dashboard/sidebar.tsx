"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, CheckCircle, Folder, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

interface SidebarProps {
  lists?: Array<{ id: string; name: string; emoji?: string | null; _count?: { savedProducts: number } }>;
  itemCounts?: {
    all: number;
    purchased: number;
  };
  onCreateListClick?: () => void;
}

export function Sidebar({ lists = [], itemCounts = { all: 0, purchased: 0 }, onCreateListClick }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <SidebarItem
          href="/dashboard"
          icon={<LayoutGrid className="w-5 h-5" />}
          label="All Items"
          count={itemCounts.all}
          isActive={pathname === "/dashboard"}
        />
        <SidebarItem
          href="/dashboard/purchased"
          icon={<CheckCircle className="w-5 h-5" />}
          label="Purchased"
          count={itemCounts.purchased}
          isActive={pathname === "/dashboard/purchased"}
        />
        <SidebarItem
          href="/dashboard/settings"
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          isActive={pathname === "/dashboard/settings"}
        />

        {/* Divider */}
        <div className="pt-4 pb-2">
          <div className="border-t border-gray-200" />
        </div>

        {/* My Lists Section */}
        <div className="pt-2">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            My Lists
          </h3>

          {lists.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Folder className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No lists yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {lists.map((list) => (
                <ListItem
                  key={list.id}
                  list={list}
                  isActive={pathname === `/dashboard/lists/${list.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Create List Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onCreateListClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-[#F4C2C2] hover:text-[#2C2C2C] hover:bg-[#FEF7F7] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create List
        </button>
      </div>
    </div>
  );
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive?: boolean;
}

function SidebarItem({ href, icon, label, count, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${isActive
          ? "bg-[#FAE5E5] text-[#2C2C2C] border-l-4 border-[#F4C2C2] -ml-1 pl-[calc(0.75rem-3px)]"
          : "text-gray-600 hover:bg-gray-100"
        }
      `}
    >
      <span className={isActive ? "text-[#D4A5A5]" : "text-gray-400"}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {typeof count === "number" && (
        <span className={`text-xs ${isActive ? "text-[#2C2C2C]" : "text-gray-400"}`}>
          {count}
        </span>
      )}
    </Link>
  );
}

interface ListItemProps {
  list: { id: string; name: string; emoji?: string | null; _count?: { savedProducts: number } };
  isActive: boolean;
}

function ListItem({ list, isActive }: ListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = async () => {
    if (!editName.trim() || editName.trim() === list.name) {
      setIsEditing(false);
      setEditName(list.name);
      return;
    }

    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename list");
      }

      toast.success("List renamed");
      router.refresh();
    } catch (error) {
      console.error("Error renaming list:", error);
      toast.error(error instanceof Error ? error.message : "Failed to rename list");
      setEditName(list.name);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete list");
      }

      toast.success("List deleted");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast.error("Failed to delete list");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditName(list.name);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-base w-5 text-center">{list.emoji || "📁"}</span>
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 text-sm border border-[#F4C2C2] rounded focus:outline-none focus:ring-1 focus:ring-[#F4C2C2]"
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      <Link
        href={`/dashboard/lists/${list.id}`}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${isActive
            ? "bg-[#FAE5E5] text-[#2C2C2C] border-l-4 border-[#F4C2C2] -ml-1 pl-[calc(0.75rem-3px)]"
            : "text-gray-600 hover:bg-gray-100"
          }
        `}
      >
        <span className={isActive ? "text-[#D4A5A5]" : "text-gray-400"}>
          {list.emoji ? (
            <span className="text-base w-5 text-center">{list.emoji}</span>
          ) : (
            <Folder className="w-5 h-5" />
          )}
        </span>
        <span className="flex-1 truncate">{list.name}</span>
        {typeof list._count?.savedProducts === "number" && (
          <span className={`text-xs ${isActive ? "text-[#2C2C2C]" : "text-gray-400"}`}>
            {list._count.savedProducts}
          </span>
        )}
      </Link>

      {/* Three-dot menu button */}
      <div ref={menuRef} className="absolute right-1 top-1/2 -translate-y-1/2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors ${
            showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
                setIsEditing(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Pencil className="w-4 h-4" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
                setShowDeleteConfirm(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#D4A5A5] hover:bg-gray-100"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#2C2C2C] mb-2">
              Delete "{list.name}"?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Products in this list will be moved to "All Items". This action cannot be undone.
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
  );
}

"use client";

import { useState } from "react";
import { Bell, Mail, User, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

interface SettingsFormProps {
  initialEmail: string;
  initialName: string;
  initialEmailNotifications: boolean;
}

export function SettingsForm({
  initialEmail,
  initialName,
  initialEmailNotifications,
}: SettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [emailNotifications, setEmailNotifications] = useState(initialEmailNotifications);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleEmailNotifications = async (enabled: boolean) => {
    setEmailNotifications(enabled);
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: enabled }),
      });

      if (!response.ok) throw new Error("Failed to update settings");

      toast.success(
        enabled ? "Email notifications enabled" : "Email notifications disabled"
      );
    } catch (error) {
      console.error("Error updating settings:", error);
      setEmailNotifications(!enabled); // Revert on error
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (name === initialName) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to update name");

      toast.success("Name updated successfully");
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Failed to update name");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-[#2C2C2C]" />
          <h2 className="text-lg font-semibold text-[#2C2C2C]">Profile</h2>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F4C2C2] focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">
              Email
            </label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{initialEmail}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-[#2C2C2C]" />
          <h2 className="text-lg font-semibold text-[#2C2C2C]">Notification Preferences</h2>
        </div>

        <div className="space-y-6">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#2C2C2C]">
                Email me about price drops
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Receive email notifications when tracked items drop in price
              </p>
            </div>
            <button
              onClick={() => handleToggleEmailNotifications(!emailNotifications)}
              disabled={isSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                emailNotifications ? "bg-[#B5C4B1]" : "bg-gray-200"
              } ${isSaving ? "opacity-50" : ""}`}
            >
              {isSaving ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                </div>
              ) : (
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    emailNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              )}
            </button>
          </div>

          {/* Coming Soon Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#F4C2C2]" />
              <span className="text-sm font-medium text-[#2C2C2C]">Coming Soon</span>
            </div>
            <div className="bg-[#FEF7F7] rounded-lg p-4">
              <p className="text-sm text-[#2C2C2C] font-medium mb-1">
                Automatic Daily Price Checks
              </p>
              <p className="text-xs text-gray-500">
                We&apos;re working on automatic price monitoring that will check your items
                daily and notify you instantly when prices drop. Stay tuned!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="text-center text-xs text-gray-400">
        <p>ChicList - Your personal wishlist tracker</p>
      </div>
    </div>
  );
}

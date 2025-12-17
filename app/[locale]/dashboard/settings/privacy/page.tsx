"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { updatePrivacySettings } from "@/app/actions/settings";
import { toast } from "react-hot-toast";

export default function PrivacyPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    profileVisibility: "public" as "public" | "members" | "private",
    showEmail: false,
    showLocation: true,
    allowMessages: "everyone" as "everyone" | "members" | "none",
    showActivity: true,
    showAchievements: true,
  });

  const handleSave = async () => {
    setLoading(true);
    const result = await updatePrivacySettings(settings);
    
    if (result.success) {
      toast.success("Privacy settings saved!");
    } else {
      toast.error(result.error || "Failed to save");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">
          Privacy Settings
        </h2>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <div>
            <label className="mb-2 block font-medium text-foreground">
              Profile Visibility
            </label>
            <select
              value={settings.profileVisibility}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  profileVisibility: e.target.value as any,
                })
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
            >
              <option value="public">Public - Everyone can see</option>
              <option value="members">Members Only - Community members</option>
              <option value="private">Private - Only you</option>
            </select>
          </div>

          {/* Who can message you */}
          <div>
            <label className="mb-2 block font-medium text-foreground">
              Who can send you messages
            </label>
            <select
              value={settings.allowMessages}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowMessages: e.target.value as any,
                })
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
            >
              <option value="everyone">Everyone</option>
              <option value="members">Members of my communities</option>
              <option value="none">No one</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Show Email</p>
                <p className="text-sm text-muted-foreground">
                  Make your email visible on your profile
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.showEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, showEmail: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Show Activity</p>
                <p className="text-sm text-muted-foreground">
                  Display your recent activity
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.showActivity}
                  onChange={(e) =>
                    setSettings({ ...settings, showActivity: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Show Achievements</p>
                <p className="text-sm text-muted-foreground">
                  Display your unlocked achievements
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.showAchievements}
                  onChange={(e) =>
                    setSettings({ ...settings, showAchievements: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {loading ? "Saving..." : "Save Privacy Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
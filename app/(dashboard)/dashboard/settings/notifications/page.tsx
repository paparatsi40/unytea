"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { updateNotificationPreferences } from "@/app/actions/settings";
import { toast } from "react-hot-toast";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    notifyOnComment: true,
    notifyOnMention: true,
    notifyOnReaction: true,
    notifyOnNewPost: false,
    notifyOnBuddyRequest: true,
    notifyOnAchievement: true,
    emailDigest: "weekly" as "daily" | "weekly" | "never",
  });

  const handleSave = async () => {
    setLoading(true);
    const result = await updateNotificationPreferences(settings);
    
    if (result.success) {
      toast.success("Preferences saved!");
    } else {
      toast.error(result.error || "Failed to save");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">
          Notification Preferences
        </h2>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, emailNotifications: e.target.checked })
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {/* Comments */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Comments</p>
              <p className="text-sm text-muted-foreground">
                When someone comments on your post
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.notifyOnComment}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOnComment: e.target.checked })
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {/* Mentions */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Mentions</p>
              <p className="text-sm text-muted-foreground">
                When someone mentions you
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.notifyOnMention}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOnMention: e.target.checked })
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {/* Reactions */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Reactions</p>
              <p className="text-sm text-muted-foreground">
                When someone reacts to your content
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.notifyOnReaction}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOnReaction: e.target.checked })
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {/* Buddy Requests */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Buddy Requests</p>
              <p className="text-sm text-muted-foreground">
                When someone wants to be your buddy
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.notifyOnBuddyRequest}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOnBuddyRequest: e.target.checked })
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {/* Achievements */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Achievements</p>
              <p className="text-sm text-muted-foreground">
                When you unlock a new achievement
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.notifyOnAchievement}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOnAchievement: e.target.checked })
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
            </label>
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
            {loading ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
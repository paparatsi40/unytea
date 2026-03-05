"use client";

import { useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { updateAccountSettings } from "@/app/actions/settings";
import { toast } from "react-hot-toast";

export default function AccountPage() {
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  const handleSave = async () => {
    setLoading(true);
    const result = await updateAccountSettings({ timezone });
    
    if (result.success) {
      toast.success("Account settings saved!");
    } else {
      toast.error(result.error || "Failed to save");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">
          Account Settings
        </h2>

        <div className="space-y-6">
          {/* Timezone */}
          <div>
            <label className="mb-2 block font-medium text-foreground">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
            >
              <option value="UTC">UTC (Universal Time)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
            <p className="mt-2 text-sm text-muted-foreground">
              Used for displaying dates and scheduling sessions
            </p>
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
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border-2 border-red-500/50 bg-red-500/5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-foreground">Danger Zone</h2>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-background p-4">
            <h3 className="mb-2 font-semibold text-foreground">Delete Account</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your account and all of your data. This action cannot be undone.
            </p>
            <button
              onClick={() => {
                if (confirm("Are you absolutely sure? This cannot be undone!")) {
                  toast.error("Account deletion temporarily disabled");
                }
              }}
              className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/20"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
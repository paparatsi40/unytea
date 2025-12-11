"use client";

import { useState } from "react";
import { Check, Sun, Moon, Monitor } from "lucide-react";
import { updateAccountSettings } from "@/app/actions/settings";
import { toast } from "react-hot-toast";

export default function AppearancePage() {
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  const handleSave = async () => {
    setLoading(true);
    const result = await updateAccountSettings({ theme });
    
    if (result.success) {
      toast.success("Appearance saved!");
    } else {
      toast.error(result.error || "Failed to save");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">Theme</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Choose how Unytea looks to you
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Light */}
          <button
            onClick={() => setTheme("light")}
            className={`rounded-xl border-2 p-6 transition-all ${
              theme === "light"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/60"
            }`}
          >
            <Sun className="mx-auto mb-3 h-8 w-8" />
            <p className="font-semibold text-foreground">Light</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Light theme
            </p>
          </button>

          {/* Dark */}
          <button
            onClick={() => setTheme("dark")}
            className={`rounded-xl border-2 p-6 transition-all ${
              theme === "dark"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/60"
            }`}
          >
            <Moon className="mx-auto mb-3 h-8 w-8" />
            <p className="font-semibold text-foreground">Dark</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dark theme
            </p>
          </button>

          {/* System */}
          <button
            onClick={() => setTheme("system")}
            className={`rounded-xl border-2 p-6 transition-all ${
              theme === "system"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/60"
            }`}
          >
            <Monitor className="mx-auto mb-3 h-8 w-8" />
            <p className="font-semibold text-foreground">System</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Match system
            </p>
          </button>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {loading ? "Saving..." : "Save Theme"}
          </button>
        </div>
      </div>
    </div>
  );
}
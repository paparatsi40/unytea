"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Sun, Moon, Monitor, Eye, LayoutTemplate, Sliders } from "lucide-react";
import { updateAccountSettings } from "@/app/actions/settings";
import { toast } from "react-hot-toast";

type Community = {
  id: string;
  name: string;
  slug: string;
  role?: string;
};

export default function AppearancePage() {
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }

    const loadCommunities = async () => {
      try {
        const response = await fetch("/api/communities");
        if (!response.ok) return;
        const data = await response.json();
        const myCommunities = (data?.myCommunities || []) as Community[];
        setCommunities(myCommunities);
        if (myCommunities.length > 0) {
          setSelectedSlug(myCommunities[0].slug);
        }
      } catch {
        // Keep UI usable even if communities endpoint fails
      }
    };

    void loadCommunities();
  }, []);

  const handleSave = async () => {
    setLoading(true);

    try {
      localStorage.setItem("theme", theme);
      const resolvedTheme =
        theme === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : theme;
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    } catch {
      // no-op
    }

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
            <p className="mt-1 text-sm text-muted-foreground">Light theme</p>
          </button>

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
            <p className="mt-1 text-sm text-muted-foreground">Dark theme</p>
          </button>

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
            <p className="mt-1 text-sm text-muted-foreground">Match system</p>
          </button>
        </div>

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

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">Community Appearance</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Customize landing, sections, and visual structure for each community.
        </p>

        {communities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don’t have communities yet. Create one to customize its appearance.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Community</label>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {communities.map((community) => (
                  <option key={community.id} value={community.slug}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/dashboard/c/${selectedSlug}/settings/landing`}>
                <button className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-foreground">Landing Page Builder</span>
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Edit hero, sections, and page structure</p>
                </button>
              </Link>

              <Link href={`/dashboard/c/${selectedSlug}/settings/sections`}>
                <button className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-foreground">Section Presets</span>
                    <Sliders className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Reorder, show/hide, and configure sections</p>
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Sun, Moon, Monitor, Eye, LayoutTemplate, Sliders } from "lucide-react";
import { updateAccountSettings } from "@/app/actions/settings";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";

// Theme enum values double as i18n keys; labels/descriptions resolved via
// t(`themes.${key}.{label,description}`) in render (helper-returns-key).
const THEME_OPTIONS = [
  { key: "light", Icon: Sun },
  { key: "dark", Icon: Moon },
  { key: "system", Icon: Monitor },
] as const;

type Community = {
  id: string;
  name: string;
  slug: string;
  role?: string;
};

export default function AppearancePage() {
  const t = useTranslations("dashboard.accountSettings.appearance");
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
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme;
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    } catch {
      // no-op
    }

    const result = await updateAccountSettings({ theme });

    if (result.success) {
      toast.success(t("toasts.saved"));
    } else {
      toast.error(result.error || t("toasts.saveFailed"));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">{t("themeTitle")}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{t("themeSubtitle")}</p>

        <div className="grid gap-4 md:grid-cols-3">
          {THEME_OPTIONS.map(({ key, Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`rounded-xl border-2 p-6 transition-all ${
                theme === key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/60"
              }`}
            >
              <Icon className="mx-auto mb-3 h-8 w-8" />
              <p className="font-semibold text-foreground">{t(`themes.${key}.label`)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`themes.${key}.description`)}</p>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {loading ? t("savingButton") : t("saveButton")}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">{t("communityTitle")}</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("communitySubtitle")}</p>

        {communities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noCommunities")}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t("communityLabel")}
              </label>
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
                    <span className="font-medium text-foreground">{t("landingCard.title")}</span>
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("landingCard.description")}</p>
                </button>
              </Link>

              <Link href={`/dashboard/c/${selectedSlug}/settings/sections`}>
                <button className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-foreground">{t("sectionsCard.title")}</span>
                    <Sliders className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("sectionsCard.description")}</p>
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { updatePrivacySettings } from "@/app/actions/settings";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";

// Enum values double as i18n keys; option labels resolved via
// t(`visibility.${key}`) / t(`messages.${key}`) in render.
const VISIBILITY_KEYS = ["public", "members", "private"] as const;
const MESSAGE_KEYS = ["everyone", "members", "none"] as const;

export default function PrivacyPage() {
  const t = useTranslations("dashboard.accountSettings.privacy");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    profileVisibility: "public" as "public" | "members" | "private",
    showEmail: false,
    showLocation: true,
    allowMessages: "everyone" as "everyone" | "members" | "none",
    showActivity: true,
  });

  const handleSave = async () => {
    setLoading(true);
    const result = await updatePrivacySettings(settings);

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
        <h2 className="mb-4 text-xl font-bold text-foreground">{t("title")}</h2>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <div>
            <label className="mb-2 block font-medium text-foreground">
              {t("profileVisibilityLabel")}
            </label>
            <select
              value={settings.profileVisibility}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  profileVisibility: e.target.value as "public" | "members" | "private",
                })
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
            >
              {VISIBILITY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`visibility.${key}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Who can message you */}
          <div>
            <label className="mb-2 block font-medium text-foreground">
              {t("allowMessagesLabel")}
            </label>
            <select
              value={settings.allowMessages}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowMessages: e.target.value as "everyone" | "members" | "none",
                })
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
            >
              {MESSAGE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`messages.${key}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">{t("showEmail.label")}</p>
                <p className="text-sm text-muted-foreground">{t("showEmail.description")}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.showEmail}
                  onChange={(e) => setSettings({ ...settings, showEmail: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">{t("showActivity.label")}</p>
                <p className="text-sm text-muted-foreground">{t("showActivity.description")}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.showActivity}
                  onChange={(e) => setSettings({ ...settings, showActivity: e.target.checked })}
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
            {loading ? t("savingButton") : t("saveButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

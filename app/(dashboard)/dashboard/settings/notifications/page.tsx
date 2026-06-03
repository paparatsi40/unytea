"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { updateNotificationPreferences } from "@/app/actions/settings";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type ToggleKey =
  | "emailNotifications"
  | "notifyOnComment"
  | "notifyOnMention"
  | "notifyOnReaction"
  | "notifyOnBuddyRequest";

// State key paired with its i18n key; labels resolved via
// t(`${i18nKey}.{label,description}`) in render (helper-returns-key).
const NOTIFICATION_TOGGLES: { stateKey: ToggleKey; i18nKey: string }[] = [
  { stateKey: "emailNotifications", i18nKey: "email" },
  { stateKey: "notifyOnComment", i18nKey: "comments" },
  { stateKey: "notifyOnMention", i18nKey: "mentions" },
  { stateKey: "notifyOnReaction", i18nKey: "reactions" },
  { stateKey: "notifyOnBuddyRequest", i18nKey: "buddyRequests" },
];

export default function NotificationsPage() {
  const t = useTranslations("dashboard.accountSettings.notifications");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    notifyOnComment: true,
    notifyOnMention: true,
    notifyOnReaction: true,
    notifyOnNewPost: false,
    notifyOnBuddyRequest: true,
    emailDigest: "weekly" as "daily" | "weekly" | "never",
  });

  const handleSave = async () => {
    setLoading(true);
    const result = await updateNotificationPreferences(settings);

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

        <div className="space-y-4">
          {NOTIFICATION_TOGGLES.map(({ stateKey, i18nKey }) => (
            <div
              key={stateKey}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium text-foreground">{t(`${i18nKey}.label`)}</p>
                <p className="text-sm text-muted-foreground">{t(`${i18nKey}.description`)}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings[stateKey]}
                  onChange={(e) => setSettings({ ...settings, [stateKey]: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          ))}
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

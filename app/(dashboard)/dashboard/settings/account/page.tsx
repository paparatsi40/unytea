"use client";

import { useState } from "react";
import { Check, AlertTriangle, Shield, KeyRound, LogOut } from "lucide-react";
import { updateAccountSettings } from "@/app/actions/settings";
import { signOut } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";

export default function AccountPage() {
  const t = useTranslations("dashboard.accountSettings.account");
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  const handleSave = async () => {
    setLoading(true);
    const result = await updateAccountSettings({ timezone });

    if (result.success) {
      toast.success(t("toasts.saved"));
    } else {
      toast.error(result.error || t("toasts.saveFailed"));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">{t("title")}</h2>

        <div className="space-y-6">
          {/* Timezone */}
          <div>
            <label className="mb-2 block font-medium text-foreground">{t("timezoneLabel")}</label>
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
            <p className="mt-2 text-sm text-muted-foreground">{t("timezoneHint")}</p>
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

      {/* Security & Access */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">{t("security.title")}</h2>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t("security.passwordTitle")}</h3>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              {t("security.passwordDescription")}
            </p>
            <button
              type="button"
              onClick={() => toast(t("security.changePasswordPlaceholderToast"))}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t("security.changePasswordButton")}
            </button>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t("security.sessionTitle")}</h3>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t("security.sessionDescription")}</p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t("security.logoutButton")}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border-2 border-red-500/50 bg-red-500/5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-foreground">{t("danger.title")}</h2>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-background p-4">
            <h3 className="mb-2 font-semibold text-foreground">{t("danger.deleteTitle")}</h3>
            <p className="mb-4 text-sm text-muted-foreground">{t("danger.deleteDescription")}</p>
            <button
              onClick={() => {
                if (confirm(t("danger.confirmPrompt"))) {
                  toast.error(t("danger.deleteDisabledToast"));
                }
              }}
              className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/20"
            >
              {t("danger.deleteButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

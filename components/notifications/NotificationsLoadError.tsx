"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";

// Client error view for the (server) notifications page — lets the failure
// strings localize via the dashboard's client NextIntlClientProvider (the
// dashboard route group has no [locale] segment for server getTranslations).
export function NotificationsLoadError({ error }: { error?: string }) {
  const t = useTranslations("dashboard.notifications");
  return (
    <div className="flex min-h-[600px] items-center justify-center">
      <div className="text-center">
        <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold text-foreground">{t("loadFailedTitle")}</h2>
        <p className="text-muted-foreground">{error || t("genericError")}</p>
      </div>
    </div>
  );
}

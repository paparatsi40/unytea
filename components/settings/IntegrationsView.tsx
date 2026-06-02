"use client";

import { Zap, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

// Brand name + emoji + status + optional href are data; each description is
// resolved via t(`items.${key}.description`) in render (helper-returns-key).
const INTEGRATIONS: {
  key: string;
  name: string;
  icon: string;
  status: "available" | "coming_soon";
  href?: string;
}[] = [
  {
    key: "stripe",
    name: "Stripe",
    icon: "💳",
    status: "available",
    href: "/dashboard/settings/billing",
  },
  { key: "zoom", name: "Zoom", icon: "📹", status: "coming_soon" },
  { key: "googleCalendar", name: "Google Calendar", icon: "📅", status: "coming_soon" },
  { key: "zapier", name: "Zapier", icon: "⚡", status: "coming_soon" },
  { key: "slack", name: "Slack", icon: "💬", status: "coming_soon" },
  { key: "discord", name: "Discord", icon: "🎮", status: "coming_soon" },
];

export function IntegrationsView() {
  const t = useTranslations("dashboard.accountSettings.integrations");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.key}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <span className="text-2xl">{integration.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                {integration.status === "coming_soon" && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    {t("comingSoon")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {t(`items.${integration.key}.description`)}
              </p>
              {integration.status === "available" && integration.href && (
                <a
                  href={integration.href}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                >
                  {t("configure")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="text-sm font-semibold text-purple-900">{t("request.title")}</h3>
            <p className="mt-1 text-xs text-purple-700">
              {t.rich("request.body", {
                email: (chunks) => (
                  <a href="mailto:support@unytea.com" className="font-medium underline">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

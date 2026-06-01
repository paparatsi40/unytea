"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Settings, Users, Eye, CreditCard } from "lucide-react";

export default function CommunitySettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dashboard.communityAdmin.settings.layout");
  const pathname = usePathname();
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const settingsNav = [
    { key: "general", href: `/dashboard/c/${slug}/settings`, icon: Settings },
    { key: "appearance", href: `/dashboard/c/${slug}/settings/landing`, icon: Eye },
    { key: "members", href: `/dashboard/c/${slug}/settings/members`, icon: Users },
    { key: "payments", href: `/dashboard/c/${slug}/settings/payments`, icon: CreditCard },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("header")}</h1>
        <p className="mt-2 text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <nav className="space-y-1">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                    isActive
                      ? "border-l-2 border-sky-600 bg-sky-50 text-sky-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-medium">{t(`nav.${item.key}.name`)}</div>
                    <div className="text-xs text-gray-500">{t(`nav.${item.key}.description`)}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

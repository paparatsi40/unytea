"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Bell, CreditCard, Palette, Zap } from "lucide-react";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

// Nav items hold a key; labels/descriptions resolved via
// t(`nav.${key}.{name,description}`) in render (helper-returns-key).
const settingsNav = [
  { key: "profile", href: "/dashboard/settings/profile", icon: User },
  { key: "notifications", href: "/dashboard/settings/notifications", icon: Bell },
  { key: "billing", href: "/dashboard/settings/billing", icon: CreditCard },
  { key: "appearance", href: "/dashboard/settings/appearance", icon: Palette },
  { key: "integrations", href: "/dashboard/settings/integrations", icon: Zap },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.accountSettings");

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-500/10">
          <Settings className="h-6 w-6 text-gray-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("shell.header")}</h1>
          <p className="text-muted-foreground">{t("shell.subtitle")}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-6">
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
                    "flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-medium">{t(`nav.${item.key}.name`)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`nav.${item.key}.description`)}
                    </div>
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

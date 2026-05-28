"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import {
  Home,
  Compass,
  Users,
  MessageSquare,
  BookOpen,
  Settings,
  TrendingUp,
  Bell,
  Library,
} from "lucide-react";

type NavItem = {
  key: string;
  href: string;
  icon: typeof Home;
  // When true, prefix href with the active locale at render time. Used for
  // links that exit the dashboard route group (which is mounted at root)
  // into the locale-prefixed marketing tree.
  localePrefix?: boolean;
};

const navigation: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: Home },
  // Explore exits the dashboard to the marketing /explore surface (pattern
  // matches Skool/Circle). Per PD V1 §5 Cat E REVISED, discovery is the
  // platform's job for the §2 emerging-creator persona. The /explore route
  // lives under app/[locale]/explore/, so the href must be locale-prefixed
  // at render time (the dashboard route group has no locale segment).
  { key: "explore", href: "/explore", icon: Compass, localePrefix: true },
  { key: "communities", href: "/dashboard/communities", icon: Users },
  { key: "messages", href: "/dashboard/messages", icon: MessageSquare },
  { key: "recordings", href: "/dashboard/recordings", icon: Library },
  { key: "knowledgeLibrary", href: "/dashboard/knowledge-library", icon: BookOpen },
  { key: "courses", href: "/dashboard/courses", icon: BookOpen },
  { key: "analytics", href: "/dashboard/analytics", icon: TrendingUp },
  { key: "notifications", href: "/dashboard/notifications", icon: Bell },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("sidebar");

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Image
            src="/unytea-logo.png"
            alt="Unytea"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-cover"
          />
          <span className="text-xl font-bold text-foreground">Unytea</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const href = item.localePrefix ? `/${locale}${item.href}` : item.href;
          const isActive = pathname === href || pathname?.startsWith(href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-purple-600/10 p-4">
          <p className="text-sm font-semibold text-foreground">{t("upgrade.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("upgrade.subtitle")}</p>
          <Link
            href="/dashboard/settings/billing"
            className="mt-3 block w-full rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("upgrade.cta")}
          </Link>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bell, Shield, Settings as SettingsIcon, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Profile",
    href: "/dashboard/settings/profile",
    icon: User,
  },
  {
    title: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Bell,
  },
  {
    title: "Privacy",
    href: "/dashboard/settings/privacy",
    icon: Shield,
  },
  {
    title: "Appearance",
    href: "/dashboard/settings/appearance",
    icon: Palette,
  },
  {
    title: "Account",
    href: "/dashboard/settings/account",
    icon: SettingsIcon,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border pb-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </div>
  );
}
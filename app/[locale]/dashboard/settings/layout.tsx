"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Bell, Shield, CreditCard, Palette, Zap, DollarSign } from "lucide-react";
import { Settings } from "lucide-react";

const settingsNav = [
  {
    name: "Profile",
    href: "/dashboard/settings/profile",
    icon: User,
    description: "Manage your personal information",
  },
  {
    name: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Bell,
    description: "Configure notification preferences",
  },
  {
    name: "Security",
    href: "/dashboard/settings/security",
    icon: Shield,
    description: "Password and authentication",
  },
  {
    name: "Payments",
    href: "/dashboard/settings/payments",
    icon: DollarSign,
    description: "Earn from paid communities",
  },
  {
    name: "Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCard,
    description: "Manage subscription and payments",
  },
  {
    name: "Appearance",
    href: "/dashboard/settings/appearance",
    icon: Palette,
    description: "Customize your experience",
  },
  {
    name: "Integrations",
    href: "/dashboard/settings/integrations",
    icon: Zap,
    description: "Connect third-party services",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-500/10">
          <Settings className="h-6 w-6 text-gray-500" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-base text-muted-foreground">
            Manage your account and preferences
          </p>
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
                    "flex items-start gap-3 rounded-lg px-3 py-2.5 text-base transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
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

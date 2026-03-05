"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings, Palette, Users, Shield, Bell, Sliders, Eye } from "lucide-react";

export default function CommunitySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const settingsNav = [
    {
      name: "General",
      href: `/dashboard/c/${slug}/settings`,
      icon: Settings,
      description: "Basic community settings",
    },
    {
      name: "Appearance",
      href: `/dashboard/c/${slug}/settings/appearance`,
      icon: Palette,
      description: "Customize layout and theme",
    },
    {
      name: "Landing Page",
      href: `/dashboard/c/${slug}/settings/landing`,
      icon: Eye,
      description: "Customize public landing page",
    },
    {
      name: "Members",
      href: `/dashboard/c/${slug}/settings/members`,
      icon: Users,
      description: "Manage roles and permissions",
    },
    {
      name: "Moderation",
      href: `/dashboard/c/${slug}/settings/moderation`,
      icon: Shield,
      description: "Content moderation settings",
    },
    {
      name: "Notifications",
      href: `/dashboard/c/${slug}/settings/notifications`,
      icon: Bell,
      description: "Notification preferences",
    },
    {
      name: "Advanced",
      href: `/dashboard/c/${slug}/settings/advanced`,
      icon: Sliders,
      description: "Advanced options",
    },
  ];

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Community Settings</h1>
        <p className="text-gray-500 mt-2">
          Manage your community preferences and configuration
        </p>
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
                      ? "bg-sky-50 text-sky-600 border-l-2 border-sky-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

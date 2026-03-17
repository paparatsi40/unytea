"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  MessageSquare,
  Video,
  BookOpen,
  Settings,
  TrendingUp,
  Award,
  Bell,
  Library,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Communities", href: "/dashboard/communities", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Sessions", href: "/dashboard/sessions", icon: Video },
  { name: "Recordings", href: "/dashboard/recordings", icon: Library },
  { name: "Knowledge Library", href: "/dashboard/knowledge-library", icon: BookOpen },
  { name: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
  { name: "Achievements", href: "/dashboard/achievements", icon: Award },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

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
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-purple-600/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            Upgrade to Premium
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlock all features
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="mt-3 block w-full rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}

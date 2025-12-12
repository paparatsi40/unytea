"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
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
  Crown,
  ArrowLeft,
} from "lucide-react";
import { useSession } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Communities", href: "/dashboard/communities", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Sessions", href: "/dashboard/sessions", icon: Video },
  { name: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
  { name: "Achievements", href: "/dashboard/achievements", icon: Award },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { locale } = useParams();

  // Check if user is admin
  const userRole = (session?.user as any)?.appRole;
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "MODERATOR";

  // Get current locale - default to 'en' for now
  const currentLocale = locale || 'en';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
            <span className="text-lg font-bold text-white">U</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Unytea
          </span>
        </Link>
      </div>

      {/* Back to Home Button */}
      <div className="px-3 pt-4 pb-2">
        <Link
          href={`/${currentLocale}`}
          className="flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/50"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
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

        {/* Admin Link (Only for admins) */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href="/dashboard/admin"
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                pathname?.startsWith("/dashboard/admin")
                  ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 shadow-sm border border-yellow-500/30"
                  : "text-muted-foreground hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-orange-500/10 hover:text-yellow-600"
              )}
            >
              <Crown className={cn("h-5 w-5", pathname?.startsWith("/dashboard/admin") && "text-yellow-600")} />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
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

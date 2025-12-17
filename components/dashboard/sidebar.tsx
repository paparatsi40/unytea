"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Bell,
  Settings,
  Crown,
  ArrowLeft,
  Sparkles,
  Compass,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { Logo } from "@/components/brand/Logo";

// Sessions removed from main navigation (now exist only within communities)
const navigation = [
  { name: 'dashboard', href: '/dashboard', icon: Home },
  { name: 'communities', href: '/dashboard/communities', icon: Users },
  { name: 'notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations('dashboard');
  
  // Extract locale from pathname (e.g., /en/dashboard -> en)
  const locale = pathname.split('/')[1] || 'en';
  
  // Navigation items with translations
  const nav = navigation.map((item) => {
    return {
      name: t(`sidebar.${item.name}`),
      href: `/${locale}${item.href}`,
      icon: item.icon
    }
  });

  // Check if user is admin
  const userRole = (session?.user as any)?.appRole;
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "MODERATOR";

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href={`/${locale}/dashboard`} className="flex items-center space-x-2">
          <Logo />
        </Link>
      </div>

      {/* Back to Home Button */}
      <div className="px-4 pt-4 pb-3">
        <Link
          href={`/${locale}`}
          className="flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/50 hover:border-primary/50"
        >
          <ArrowLeft className="h-6 w-6" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "text-primary")} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Admin Link (Only for admins) */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href={`/${locale}/dashboard/admin`}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200",
                pathname?.startsWith(`/${locale}/dashboard/admin`)
                  ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 shadow-sm border border-yellow-500/30"
                  : "text-muted-foreground hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-orange-500/10 hover:text-yellow-600"
              )}
            >
              <Crown className={cn("h-6 w-6", pathname?.startsWith(`/${locale}/dashboard/admin`) && "text-yellow-600")} />
              <span>{t('sidebar.admin')}</span>
            </Link>
          </>
        )}
        
        {/* Discover Communities - DESTACADO */}
        <div className="my-3 border-t border-border pt-3" />
        <Link
          href={`/${locale}/dashboard/communities?tab=discover`}
          className="group relative overflow-hidden flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-semibold transition-all duration-200 bg-gradient-to-r from-primary/10 via-purple-600/10 to-pink-600/10 hover:from-primary/20 hover:via-purple-600/20 hover:to-pink-600/20 border border-primary/30 hover:border-primary/50 shadow-sm hover:shadow-md"
        >
          <div className="relative">
            <Compass className="h-6 w-6 text-primary group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {t('discover.sidebarTitle')}
              </span>
              <span className="inline-flex items-center rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-bold text-yellow-600">
                {t('discover.sidebarBadge')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
              {t('discover.sidebarDesc')}
            </p>
          </div>
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-purple-600/10 p-4">
          <p className="text-lg font-semibold text-foreground">
            {t('sidebar.upgrade')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Unlock all features
          </p>
          <Link
            href={`/${locale}/dashboard/settings/billing`}
            className="mt-3 block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  MessageSquare,
  Video,
  BookOpen,
  Trophy,
  Users,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { CommunitySwitcher } from "./CommunitySwitcher";
import { Logo } from "@/components/brand/Logo";

interface CommunitySidebarProps {
  communityId: string;
  slug: string;
  userId: string;
  isOwner: boolean;
  locale: string;
}

export function CommunitySidebar({ communityId, slug, userId, isOwner, locale }: CommunitySidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      href: `/${locale}/dashboard/communities/${slug}/feed`,
      label: "Feed",
      icon: Home,
    },
    {
      href: `/${locale}/dashboard/communities/${slug}/chat`,
      label: "Chat",
      icon: MessageSquare,
    },
    {
      href: `/${locale}/dashboard/communities/${slug}/sessions`,
      label: "Sessions",
      icon: Video,
    },
    {
      href: `/${locale}/dashboard/communities/${slug}/courses`,
      label: "Courses",
      icon: BookOpen,
    },
    {
      href: `/${locale}/dashboard/communities/${slug}/leaderboard`,
      label: "Leaderboard",
      icon: Trophy,
    },
    {
      href: `/${locale}/dashboard/communities/${slug}/members`,
      label: "Members",
      icon: Users,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href={`/${locale}/dashboard`} className="flex items-center space-x-2">
          <Logo iconSize={40} />
        </Link>
      </div>

      {/* Community Switcher */}
      <CommunitySwitcher currentCommunityId={communityId} userId={userId} locale={locale} />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");

          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* Settings Link (Only for owners) */}
        {isOwner && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href={`/${locale}/dashboard/communities/${slug}/settings`}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                pathname?.startsWith(`/${locale}/dashboard/communities/${slug}/settings`)
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Settings className={cn("h-5 w-5", pathname?.startsWith(`/${locale}/dashboard/communities/${slug}/settings`) && "text-primary")} />
              <span>Manage</span>
            </Link>
          </>
        )}
      </nav>

      {/* Back to Dashboard Button */}
      <div className="border-t border-border px-3 py-4">
        <Link
          href={`/${locale}/dashboard`}
          className="flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/50 hover:border-primary/50"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>All Communities</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-purple-600/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            Upgrade Community
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlock premium features
          </p>
          <Link
            href={`/${locale}/dashboard/communities/${slug}/settings/billing`}
            className="mt-3 block w-full rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}

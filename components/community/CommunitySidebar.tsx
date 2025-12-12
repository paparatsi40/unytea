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

const navigation = [
  { name: "Feed", href: "/feed", icon: Home },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Sessions", href: "/sessions", icon: Video },
  { name: "Courses", href: "/courses", icon: BookOpen },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Members", href: "/members", icon: Users },
];

interface CommunitySidebarProps {
  communityId: string;
  userId: string;
  isOwner: boolean;
}

export function CommunitySidebar({ communityId, userId, isOwner }: CommunitySidebarProps) {
  const pathname = usePathname();

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

      {/* Community Switcher */}
      <CommunitySwitcher currentCommunityId={communityId} userId={userId} />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const fullHref = `/dashboard/communities/${communityId}${item.href}`;
          const isActive = pathname === fullHref || pathname?.startsWith(fullHref + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={fullHref}
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

        {/* Settings Link (Only for owners) */}
        {isOwner && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href={`/dashboard/communities/${communityId}/settings`}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                pathname?.startsWith(`/dashboard/communities/${communityId}/settings`)
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Settings className={cn("h-5 w-5", pathname?.startsWith(`/dashboard/communities/${communityId}/settings`) && "text-primary")} />
              <span>Manage</span>
            </Link>
          </>
        )}
      </nav>

      {/* Back to Dashboard Button */}
      <div className="border-t border-border px-3 py-4">
        <Link
          href="/dashboard"
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
            href={`/dashboard/communities/${communityId}/settings/billing`}
            className="mt-3 block w-full rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}

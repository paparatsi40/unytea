"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, FileText, Users, MessageSquare, Settings } from "lucide-react";

interface CommunitySubHeaderProps {
  communitySlug: string;
  communityName: string;
}

export function CommunitySubHeader({ communitySlug, communityName }: CommunitySubHeaderProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Home",
      href: `/dashboard/c/${communitySlug}`,
      icon: Home,
      match: (path: string) => path === `/dashboard/c/${communitySlug}`,
    },
    {
      name: "Posts",
      href: `/dashboard/c/${communitySlug}`,
      icon: FileText,
      match: (path: string) => path.includes("/posts") || path === `/dashboard/c/${communitySlug}`,
    },
    {
      name: "Members",
      href: `/dashboard/c/${communitySlug}/members`,
      icon: Users,
      match: (path: string) => path.includes("/members"),
    },
    {
      name: "Chat",
      href: `/dashboard/c/${communitySlug}/chat`,
      icon: MessageSquare,
      match: (path: string) => path.includes("/chat"),
    },
    {
      name: "Settings",
      href: `/dashboard/c/${communitySlug}/settings`,
      icon: Settings,
      match: (path: string) => path.includes("/settings"),
    },
  ];

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-20">
      <div className="px-6 py-3">
        {/* Community Name */}
        <h2 className="text-lg font-semibold text-foreground mb-3">
          {communityName}
        </h2>

        {/* Tab Navigation */}
        <nav className="flex space-x-1">
          {navigation.map((item) => {
            const isActive = item.match(pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
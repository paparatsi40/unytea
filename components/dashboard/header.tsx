"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { signOut } from "next-auth/react";
import { Search, LogOut, User as UserIcon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTranslations } from "next-intl";

export function DashboardHeader() {
  const { user } = useCurrentUser();
  const t = useTranslations();

  const getInitials = (name?: string | null) => {
    if (!name) return "U";

    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex flex-1 items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("common.search")}
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/dashboard/messages">
            <Button variant="ghost" size="icon" className="relative" aria-label={t("navigation.messages")}>
              <MessageSquare className="h-5 w-5" />
            </Button>
          </Link>

          <NotificationCenter />
          <ThemeToggle />
          <LanguageSelector />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-3 focus:outline-none">
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold text-foreground">
                    {user?.name || t("navigation.profile")}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>

                <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-border transition-all hover:ring-primary">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || t("navigation.profile")} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 font-semibold text-white">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.name || t("navigation.profile")}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>{t("navigation.profile")}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("navigation.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { signOut } from "next-auth/react";
import { 
  Bell, 
  Search, 
  LogOut, 
  User as UserIcon, 
  MessageSquare,
  Settings,
  DollarSign,
  Users,
  BarChart3,
  HelpCircle,
  BookOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from 'next-intl';

export function DashboardHeader() {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const t = useTranslations('dashboard');
  
  // Extract locale from pathname
  const locale = pathname.split('/')[1] || 'en';

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
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="flex flex-1 items-center space-x-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('header.search')}
              className="h-11 w-full rounded-lg border border-border bg-background pl-11 pr-4 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="icon"
                className="h-10 w-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-base">{t('header.quickActions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/communities/new`} className="cursor-pointer text-base py-3">
                  <Users className="mr-3 h-5 w-5" />
                  {t('header.createCommunity')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Messages */}
          <Link href={`/${locale}/dashboard/messages`}>
            <Button variant="ghost" size="icon" className="relative h-10 w-10">
              <MessageSquare className="h-5 w-5" />
            </Button>
          </Link>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-3 focus:outline-none">
                <div className="text-right">
                  <p className="text-base font-semibold text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-border hover:ring-primary transition-all">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-semibold text-base">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-base font-medium">{user?.name || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* My Account Section */}
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/settings/profile`} className="cursor-pointer text-base py-3">
                  <UserIcon className="mr-3 h-5 w-5" />
                  {t('header.myProfile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/communities/manage`} className="cursor-pointer text-base py-3">
                  <Users className="mr-3 h-5 w-5" />
                  {t('header.myCommunities')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/analytics`} className="cursor-pointer text-base py-3">
                  <BarChart3 className="mr-3 h-5 w-5" />
                  {t('header.analytics')}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Billing Section */}
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/settings/payments`} className="cursor-pointer text-base py-3">
                  <DollarSign className="mr-3 h-5 w-5" />
                  {t('header.paymentsEarnings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/settings/billing`} className="cursor-pointer text-base py-3">
                  <Settings className="mr-3 h-5 w-5" />
                  {t('header.subscriptionBilling')}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Help Section */}
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/settings`} className="cursor-pointer text-base py-3">
                  <Settings className="mr-3 h-5 w-5" />
                  {t('header.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-base py-3">
                <HelpCircle className="mr-3 h-5 w-5" />
                {t('header.helpSupport')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-base py-3">
                <BookOpen className="mr-3 h-5 w-5" />
                {t('header.documentation')}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Sign Out */}
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
                className="text-red-600 focus:text-red-600 text-base py-3"
              >
                <LogOut className="mr-3 h-5 w-5" />
                {t('header.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

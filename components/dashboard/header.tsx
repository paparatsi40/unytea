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

export function DashboardHeader() {
  const { user } = useCurrentUser();

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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search communities, courses, members..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/communities/new" className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  Create Community
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/sessions" className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Schedule Session
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Messages */}
          <Link href="/dashboard/messages">
            <Button variant="ghost" size="icon" className="relative">
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
                  <p className="text-sm font-semibold text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-border hover:ring-primary transition-all">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-semibold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* My Account Section */}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/profile" className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/communities/manage" className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  My Communities
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/analytics" className="cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Billing Section */}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/payments" className="cursor-pointer">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payments & Earnings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/billing" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Subscription & Billing
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Help Section */}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BookOpen className="mr-2 h-4 w-4" />
                Documentation
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Sign Out */}
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

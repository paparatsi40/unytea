"use client";

import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";
import { useSession } from "next-auth/react";

interface HomeNavProps {
  locale: string;
}

export function HomeNav({ locale }: HomeNavProps) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-white">U</span>
          </div>
          <span className="text-xl font-bold">Unytea</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link href="#community" className="text-sm font-medium hover:text-primary transition-colors">
            Community
          </Link>
          {session?.user && (
            <Link 
              href="/dashboard" 
              className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
          ) : session?.user ? (
            <Link
              href="/dashboard"
              className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={`/${locale}/auth/signin`}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={`/${locale}/auth/signup`}
                className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth"
              >
                Start Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

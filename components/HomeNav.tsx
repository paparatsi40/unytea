"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "@/components/brand/Logo";

interface HomeNavProps {
  locale: string;
}

export function HomeNav({ locale }: HomeNavProps) {
  const { data: _session, status } = useSession();
  const t = useTranslations("nav");

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
            {t("features")}
          </Link>
          <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
            {t("pricing")}
          </Link>
          <Link href="#community" className="text-sm font-medium hover:text-primary transition-colors">
            {t("community")}
          </Link>

          {isAuthenticated && (
            <Link
              href={`/${locale}/dashboard`}
              className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t("dashboard")}
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {isLoading ? (
            <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
          ) : isAuthenticated ? (
            <Link
              href={`/${locale}/dashboard`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t("gotodashboard")}
            </Link>
          ) : (
            <>
              <Link
                href={`/${locale}/auth/signin`}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {t("signin")}
              </Link>
              <Link
                href={`/${locale}/auth/signup`}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth"
              >
                {t("startfree")}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

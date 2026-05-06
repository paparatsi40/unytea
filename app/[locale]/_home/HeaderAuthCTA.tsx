"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, LogIn, UserPlus } from "lucide-react";

/**
 * Login-state-aware buttons in the marketing nav. Lives in its own client
 * component so the parent home page can stay a server component (which lets
 * us export proper canonical+hreflang metadata for SEO).
 */
export function HeaderAuthCTA({ locale }: { locale: string }) {
  const { data: session } = useSession();
  const t = useTranslations("landing");
  const authT = useTranslations("auth");
  const isLoggedIn = !!session?.user;

  if (isLoggedIn) {
    return (
      <Link
        href="/dashboard"
        className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
      >
        <LayoutDashboard className="w-4 h-4" />
        {t("nav.goToDashboard")}
      </Link>
    );
  }

  return (
    <>
      <Link
        href={`/${locale}/auth/signin`}
        className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <LogIn className="w-4 h-4" />
        {authT("signIn")}
      </Link>
      <Link
        href={`/${locale}/auth/signup`}
        className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        {authT("signUp")}
      </Link>
    </>
  );
}

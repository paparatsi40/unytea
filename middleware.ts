import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { auth } from "@/lib/auth";

// Create the intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true
});

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Skip API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/socket.io/") ||
    pathname.includes("/api/socket")
  ) {
    return NextResponse.next();
  }

  // Extract locale from pathname
  const localeRegex = new RegExp(`^/(${locales.join('|')})(/|$)`);
  const localeMatch = pathname.match(localeRegex);
  const locale = localeMatch ? localeMatch[1] : defaultLocale;

  // Remove locale prefix for route checks
  // e.g. /en/auth/signup → /auth/signup
  const pathnameWithoutLocale = localeMatch
    ? pathname.slice(locale.length + 1) || "/"
    : pathname;

  // Redirect old /dashboard/c/ routes to new /dashboard/communities/ routes
  if (pathnameWithoutLocale.startsWith("/dashboard/c/")) {
    const slug = pathnameWithoutLocale.replace("/dashboard/c/", "").split("/")[0];
    const rest = pathnameWithoutLocale.replace(`/dashboard/c/${slug}`, "");
    const newPath = rest && rest !== "/" 
      ? `/${locale}/dashboard/communities/${slug}${rest}`
      : `/${locale}/dashboard/communities/${slug}/feed`;
    return NextResponse.redirect(new URL(newPath, req.url));
  }

  // Redirect /dashboard/c (without slug) to /dashboard/communities
  if (pathnameWithoutLocale === "/dashboard/c" || pathnameWithoutLocale === "/dashboard/c/") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard/communities`, req.url));
  }

  // Public routes
  const isPublicRoute =
    pathnameWithoutLocale === "/" ||
    pathnameWithoutLocale.startsWith("/auth/") ||
    pathnameWithoutLocale.startsWith("/contact") ||
    pathnameWithoutLocale.startsWith("/privacy") ||
    pathnameWithoutLocale.startsWith("/terms") ||
    pathnameWithoutLocale.startsWith("/c/");

  // Protected routes
  const isProtectedRoute =
    pathnameWithoutLocale.startsWith("/dashboard") ||
    pathnameWithoutLocale.startsWith("/onboarding");

  // Redirect unauthenticated users
  if (isProtectedRoute && !isLoggedIn) {
    const response = intlMiddleware(req);
    const redirectUrl = new URL(`/${locale}/auth/signin`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect logged-in users away from auth pages
  if (pathnameWithoutLocale.startsWith("/auth/") && isLoggedIn) {
    const response = intlMiddleware(req);
    const redirectUrl = new URL(`/${locale}/dashboard`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Apply next-intl middleware for all other cases
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};

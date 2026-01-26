import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { auth } from "@/lib/auth";
import { generateNonce, buildCSP } from "@/lib/csp";

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

  // Redirect vercel.app to custom domain
  // DISABLED: This causes CORS issues with fetch/API calls
  // Keep both domains working to avoid preflight request failures
  // const hostname = req.headers.get("host") || "";
  // if (hostname.includes("vercel.app")) {
  //   const newUrl = new URL(req.url);
  //   newUrl.host = "www.unytea.com";
  //   return NextResponse.redirect(newUrl, 308); // 308 Permanent Redirect
  // }

  // Generate nonce for CSP
  const nonce = generateNonce();
  const csp = buildCSP(nonce);

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

  // If no locale in path, redirect to path with locale
  if (!localeMatch && pathname !== "/" && !pathname.startsWith("/api")) {
    const newUrl = new URL(`/${locale}${pathname}`, req.url);
    newUrl.search = req.nextUrl.search;
    return NextResponse.redirect(newUrl);
  }

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
  // Removed unused variable declaration

  // Protected routes
  const isProtectedRoute =
    pathnameWithoutLocale.startsWith("/dashboard") ||
    pathnameWithoutLocale.startsWith("/onboarding");

  // Redirect unauthenticated users to signin with locale
  if (isProtectedRoute && !isLoggedIn) {
    const redirectUrl = new URL(`/${locale}/auth/signin`, req.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect logged-in users away from auth pages
  if (pathnameWithoutLocale.startsWith("/auth/") && isLoggedIn) {
    const redirectUrl = new URL(`/${locale}/dashboard`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Apply next-intl middleware for all other cases
  const response = intlMiddleware(req);
  
  // Add CSP and nonce to response headers
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  
  return response;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};

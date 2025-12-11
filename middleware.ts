import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { auth } from "@/lib/auth"

// Create the intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // Skip intl middleware for API routes, dashboard, and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/socket.io/') ||
    pathname.startsWith('/dashboard') ||
    pathname.includes('/api/socket')
  ) {
    return NextResponse.next();
  }

  // Apply intl routing for non-API/non-dashboard routes
  const response = intlMiddleware(req);

  // Remove locale prefix to check routes
  // e.g., /en/auth/signup -> /auth/signup
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es|fr|pt)/, '') || '/';

  // Public routes (accessible without auth)
  const isPublicRoute =
    pathnameWithoutLocale === "/" ||
    pathnameWithoutLocale.startsWith("/auth/") ||
    pathnameWithoutLocale.startsWith("/contact") ||
    pathnameWithoutLocale.startsWith("/privacy") ||
    pathnameWithoutLocale.startsWith("/terms") ||
    pathnameWithoutLocale.startsWith("/c/")

  // Protected routes (require auth)
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathnameWithoutLocale.startsWith("/onboarding")

  // Redirect logic
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(`/en/auth/signin`, req.url))
  }

  if (pathnameWithoutLocale.startsWith("/auth/") && isLoggedIn) {
    return NextResponse.redirect(new URL(`/dashboard`, req.url))
  }

  return response;
})

export const config = {
  // Match all routes except:
  // - API routes (/api/*)
  // - Next.js internals (_next/*)
  // - Static files (with file extensions)
  matcher: [
    '/((?!api/|_next/|_vercel/|.*\\..*).*)',
  ],
}

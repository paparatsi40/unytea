import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"

const locales = ["en", "es", "fr"]
const defaultLocale = "en"

// Create i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
})

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // Skip i18n for API routes only
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next()
  }

  // Apply i18n middleware to ALL routes (including auth and dashboard)
  const intlResponse = intlMiddleware(req)
  
  // If i18n redirected/rewrote, respect that
  if (intlResponse.status !== 200 || intlResponse.headers.get("x-middleware-rewrite")) {
    // Continue with auth checks on the rewritten request
  }
  
  // Check if we need auth redirect
  const isProtectedRoute = 
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding")

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  if (pathname.startsWith("/auth/") && isLoggedIn && !pathname.includes("callback")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return intlResponse
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

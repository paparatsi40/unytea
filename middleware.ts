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

  // Skip i18n for API routes and dashboard routes
  if (pathname.startsWith("/api") || 
      pathname.startsWith("/_next") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding")) {
    
    // Check auth for protected routes
    const isProtectedRoute = 
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding")

    if (isProtectedRoute && !isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/signin", req.url))
    }
    
    return NextResponse.next()
  }

  // Apply i18n middleware to auth and public routes
  const intlResponse = intlMiddleware(req)
  
  // Redirect authenticated users away from auth pages
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

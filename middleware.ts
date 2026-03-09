import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"

const locales = ["en", "es", "fr"] as const
const defaultLocale = "en"

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
})

function getLocaleFromPath(pathname: string) {
  const found = locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
  return found ?? defaultLocale
}

function stripLocale(pathname: string, locale: string) {
  if (pathname === `/${locale}`) return "/"
  if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  return pathname
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname

  // No tocar assets / next internals / api
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Primero aplica i18n (para que siempre exista /en, /es, /fr)
  const intlResponse = intlMiddleware(req)

  const isLoggedIn = !!req.auth
  const locale = getLocaleFromPath(pathname)
  const pathnameWithoutLocale = stripLocale(pathname, locale)

  const isProtectedRoute =
    pathnameWithoutLocale.startsWith("/dashboard") ||
    pathnameWithoutLocale.startsWith("/onboarding")

  if (isProtectedRoute && !isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = `/${locale}/auth/signin`
    // opcional: callback
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  if (
    pathnameWithoutLocale.startsWith("/auth/") &&
    isLoggedIn &&
    !pathnameWithoutLocale.includes("callback")
  ) {
    const url = req.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(url)
  }

  return intlResponse
})

export const config = {
  matcher: [
    // Excluye archivos con extensión y rutas internas típicas
    "/((?!api|_next|favicon.ico|.*\\..*).*)",
  ],
}
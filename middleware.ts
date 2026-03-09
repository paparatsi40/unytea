import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"

const locales = ["en", "es", "fr"] as const
const defaultLocale = "en"

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always"
})

function getLocaleFromPath(pathname: string) {
  const seg = pathname.split("/")[1]
  return (locales as readonly string[]).includes(seg) ? seg : defaultLocale
}

function stripLocale(pathname: string) {
  const seg = pathname.split("/")[1]
  if ((locales as readonly string[]).includes(seg)) {
    const rest = pathname.split("/").slice(2).join("/")
    return "/" + rest
  }
  return pathname
}

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // 1) Aplicar i18n SIEMPRE (excepto assets/api via matcher)
  const intlResponse = intlMiddleware(req)

  // 2) Normalizar ruta para checks (sin /en, /es, /fr)
  const locale = getLocaleFromPath(pathname)
  const normalizedPath = stripLocale(pathname)

  const isAuthRoute = normalizedPath.startsWith("/auth")
  const isProtectedRoute =
    normalizedPath.startsWith("/dashboard") || normalizedPath.startsWith("/onboarding")

  // 3) Protección: si no hay sesión y es ruta protegida -> /{locale}/auth/signin
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, req.url))
  }

  // 4) Si ya está logueado y entra a /auth/* (excepto callback) -> /{locale}/dashboard
  if (isAuthRoute && isLoggedIn && !normalizedPath.includes("callback")) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url))
  }

  // 5) Continuar con headers/cookies de next-intl
  return intlResponse
})

export const config = {
  matcher: [
    // Excluye Next.js internals, assets estáticos e API
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
}
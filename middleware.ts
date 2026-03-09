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

  // Si la ruta no tiene locale, dejar que next-intl la maneje primero
  const firstSegment = pathname.split("/")[1]
  const hasLocale = (locales as readonly string[]).includes(firstSegment)

  // Si NO tiene locale (ej: /auth/signin), aplicar intlMiddleware primero
  // que redirigirá a /en/auth/signin
  if (!hasLocale) {
    const intlResponse = intlMiddleware(req)
    // Si next-intl redirige (por falta de locale), retornar esa respuesta
    if (intlResponse.status === 307 || intlResponse.status === 308) {
      return intlResponse
    }
  }

  // Ahora procesar con locale detectado
  const locale = getLocaleFromPath(pathname)
  const normalizedPath = stripLocale(pathname)

  const isAuthRoute = normalizedPath.startsWith("/auth")
  const isProtectedRoute =
    normalizedPath.startsWith("/dashboard") || normalizedPath.startsWith("/onboarding")

  // Protección: ruta protegida sin sesión -> /{locale}/auth/signin
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, req.url))
  }

  // Ya logueado en auth -> /{locale}/dashboard
  if (isAuthRoute && isLoggedIn && !normalizedPath.includes("callback")) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url))
  }

  // Para rutas con locale, aplicar intlMiddleware para headers/cookies
  if (hasLocale) {
    return intlMiddleware(req)
  }

  // Ruta sin locale que no necesita redirect (no debería pasar)
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Excluye Next.js internals, assets estáticos e API
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
}
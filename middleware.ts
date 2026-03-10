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

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // Detectar locale en la ruta
  const firstSegment = pathname.split("/")[1]
  const hasLocale = (locales as readonly string[]).includes(firstSegment)

  // Rutas que NO deben tener prefijo de locale (dashboard, onboarding están fuera de [locale])
  const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")
  
  // Si es ruta protegida sin locale: manejar protección SIN redirigir a /{locale}/dashboard
  if (isProtectedRoute && !hasLocale) {
    // Protección: ruta protegida sin sesión -> /auth/signin (sin locale)
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/signin", req.url))
    }
    // Usuario logueado: continuar sin aplicar intlMiddleware (dashboard está fuera de [locale])
    return NextResponse.next()
  }

  // Para rutas con locale (incluyendo /{locale}/auth/*)
  if (hasLocale) {
    const normalizedPath = "/" + pathname.split("/").slice(2).join("/")
    
    const isAuthRoute = normalizedPath.startsWith("/auth")
    const isProtectedWithLocale = normalizedPath.startsWith("/dashboard") || normalizedPath.startsWith("/onboarding")
    
    // Protección con locale: redirigir a /auth/signin (sin locale)
    if (isProtectedWithLocale && !isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/signin", req.url))
    }
    
    // Ya logueado en auth con locale -> /dashboard (sin locale, dashboard está fuera de [locale])
    if (isAuthRoute && isLoggedIn && !normalizedPath.includes("callback")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    
    return intlMiddleware(req)
  }

  // Rutas públicas sin locale (como /auth/*): aplicar intlMiddleware para redirigir a /{locale}/*
  const intlResponse = intlMiddleware(req)
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse
  }
  
  // Ya logueado en auth sin locale -> /dashboard (excepto si va a onboarding)
  const isAuthRoute = pathname.startsWith("/auth")
  const isGoingToOnboarding = req.nextUrl.searchParams.has("newUser") || 
                              req.headers.get("referer")?.includes("/onboarding")
  if (isAuthRoute && isLoggedIn && !pathname.includes("callback") && !isGoingToOnboarding) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Excluye Next.js internals, assets estáticos e API
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
}
import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"

const locales = ["en", "es", "fr"] as const
const defaultLocale = "en"

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
  // Disable next-intl's NEXT_LOCALE cookie. Without this, every cached response
  // from the CDN ships the same Set-Cookie to every visitor — overwriting a
  // visitor's stored language preference whenever they land on a page in a
  // different locale. The locale is already in the URL prefix, so the cookie
  // adds no behavior we need; auth/layout.tsx falls back to 'en' when absent.
  localeCookie: false
})

/**
 * Marketing/public routes don't need session info, so they bypass auth() entirely.
 * Esto previene que NextAuth setee cookies CSRF en visitas anónimas, lo que:
 *   1. Desbloquea cache de CDN en Vercel (sin Set-Cookie, la respuesta es cacheable).
 *   2. Mejora cumplimiento GDPR/ePrivacy (no seteas cookies pre-consent).
 *   3. Reduce TTFB en marketing pages.
 *
 * Solo las rutas que necesitan saber si hay sesión (login redirects, route protection)
 * pasan por auth().
 */
function routeNeedsAuth(pathname: string): boolean {
  // Strip locale prefix: "/en/auth/signin" -> "/auth/signin"
  const segments = pathname.split("/").filter(Boolean)
  const hasLocale =
    segments[0] !== undefined &&
    (locales as readonly string[]).includes(segments[0])
  const path = hasLocale ? "/" + segments.slice(1).join("/") : pathname

  return (
    path.startsWith("/auth") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding")
  )
}

// Handler con auth(): contiene la lógica original de protección de rutas y redirecciones
// post-login. Solo corre para rutas que necesitan saber si el usuario está logueado.
const authMiddleware = auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // Detectar locale en la ruta
  const firstSegment = pathname.split("/")[1]
  const hasLocale = (locales as readonly string[]).includes(firstSegment)

  // Rutas que NO deben tener prefijo de locale (dashboard, onboarding están fuera de [locale])
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")

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
    const isProtectedWithLocale =
      normalizedPath.startsWith("/dashboard") ||
      normalizedPath.startsWith("/onboarding")

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
  const isGoingToOnboarding =
    req.nextUrl.searchParams.has("newUser") ||
    req.headers.get("referer")?.includes("/onboarding")
  if (
    isAuthRoute &&
    isLoggedIn &&
    !pathname.includes("callback") &&
    !isGoingToOnboarding
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

// Dispatcher: decide si la request necesita auth() o solo intl.
export default function middleware(req: NextRequest) {
  if (routeNeedsAuth(req.nextUrl.pathname)) {
    // El cast es seguro: auth() acepta NextRequest y construye NextAuthRequest internamente.
    return (
      authMiddleware as unknown as (
        r: NextRequest
      ) => Response | Promise<Response>
    )(req)
  }
  // Marketing/public routes: solo intl, sin auth() → sin cookies de NextAuth en respuestas anónimas.
  return intlMiddleware(req)
}

export const config = {
  matcher: [
    // Excluye Next.js internals, assets estáticos, API, PWA files, archivos SEO y excalidraw.
    // Las exclusiones de sitemap.xml/robots.txt/.xml/.txt evitan que intlMiddleware redirija
    // /sitemap.xml -> /en/sitemap.xml -> 404.
    "/((?!api|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|sitemap\\.xml|robots\\.txt|icons/|excalidraw-assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|xml|txt)$).*)"
  ]
}

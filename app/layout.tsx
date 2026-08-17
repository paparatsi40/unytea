import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { jsonLdSafe } from "@/lib/json-ld";
import { GeistMono } from "geist/font/mono";
import { SessionProvider } from "next-auth/react";
import { Toaster as SonnerToaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { SITE_URL } from "@/lib/site-url";
import { baseOpenGraph } from "@/lib/seo/open-graph";

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  // maximumScale removed: bloquea zoom en mobile y falla WCAG 1.4.4 (a11y).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  // metadataBase resuelve URLs relativas (og:image, etc.) a absolutas en producción.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Unytea — Where Communities Unite",
    template: "%s | Unytea",
  },
  description:
    "Un perfil, todas tus comunidades. Sesiones en vivo, cursos y monetización en una sola plataforma multiidioma. Alternativa moderna a Skool, Circle y Mighty Networks.",
  keywords: [
    "plataforma de comunidades",
    "alternativa a skool",
    "skool alternative",
    "comunidad online",
    "community platform",
    "online communities",
    "community building",
    "live sessions",
    "online courses",
    "creators",
    "coaching communities",
    "buddy system",
  ],
  authors: [{ name: "Unytea Team" }],
  creator: "Unytea",
  publisher: "Unytea",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Unytea",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      en: "/en",
      es: "/es",
      fr: "/fr",
      "x-default": "/",
    },
  },
  // Spread, never inline — see lib/seo/open-graph.ts. A page that writes its
  // own `openGraph` object replaces this one whole.
  openGraph: {
    ...baseOpenGraph,
    title: "Unytea — Where Communities Unite",
    description:
      "The community platform for creators with more than one audience. Live sessions, courses, monetization. Multilingual from day one.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unytea — Where Communities Unite",
    description: "The community platform for creators with more than one audience.",
    creator: "@unytea",
    site: "@unytea",
    images: ["/og"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/unytea-logo.png",
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152" },
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD structured data — ayuda a Google a renderizar rich snippets
// (sitelinks search box, knowledge panel, breadcrumbs).
const JSON_LD_ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Unytea",
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512x512.png`,
  description:
    "Community platform for creators with multiple audiences. Live sessions, courses and monetization in one multilingual app.",
  sameAs: [
    "https://twitter.com/unytea",
    "https://linkedin.com/company/unytea",
    "https://github.com/paparatsi40/unytea",
  ],
};

const JSON_LD_WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Unytea",
  url: SITE_URL,
  inLanguage: ["en", "es", "fr"],
};

const JSON_LD_SOFTWARE = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Unytea",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web, iOS, Android",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to start, paid plans available for monetization features.",
  },
  description:
    "Build and grow online communities with live sessions, courses, and monetization tools.",
  url: SITE_URL,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {/* JSON-LD structured data para SEO / rich snippets en Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(JSON_LD_ORGANIZATION) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(JSON_LD_WEBSITE) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(JSON_LD_SOFTWARE) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch {}
})();`,
          }}
        />
        <ServiceWorkerRegistrar />
        <SessionProvider>
          {children}
          <PWAInstallPrompt />
          <CookieConsent />
          {/* Single toast surface — all callers use sonner now (react-hot-toast
              was consolidated into it in perf-4). */}
          <SonnerToaster position="top-right" richColors closeButton />
        </SessionProvider>
        {/* Vercel RUM — only ship data in production deployments; no-op locally. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

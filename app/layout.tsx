import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  // maximumScale removed: bloquea zoom en mobile y falla WCAG 1.4.4 (a11y).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  // metadataBase resuelve URLs relativas (og:image, etc.) a absolutas en producción.
  metadataBase: new URL("https://www.unytea.com"),
  title: {
    default: "Unytea — Where Communities Unite",
    template: "%s | Unytea",
  },
  description:
    "Un perfil, todas tus comunidades. Sesiones en vivo, cursos, gamificación y monetización en una sola plataforma multiidioma. Alternativa moderna a Skool, Circle y Mighty Networks.",
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
    "gamification",
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
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["es_ES", "fr_FR"],
    url: "https://www.unytea.com",
    title: "Unytea — Where Communities Unite",
    description:
      "The community platform for creators with more than one audience. Live sessions, courses, gamification, monetization. Multilingual from day one.",
    siteName: "Unytea",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "Unytea — Where Communities Unite",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unytea — Where Communities Unite",
    description:
      "The community platform for creators with more than one audience.",
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
  url: "https://www.unytea.com",
  logo: "https://www.unytea.com/icons/icon-512x512.png",
  description:
    "Community platform for creators with multiple audiences. Live sessions, courses, gamification and monetization in one multilingual app.",
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
  url: "https://www.unytea.com",
  inLanguage: ["en", "es", "fr"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.unytea.com/en/explore?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
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
    "Build and grow online communities with live sessions, courses, gamification, and monetization tools.",
  url: "https://www.unytea.com",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        {/* JSON-LD structured data para SEO / rich snippets en Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORGANIZATION) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_WEBSITE) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SOFTWARE) }}
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
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(224 71% 4%)',
                color: 'hsl(213 31% 91%)',
                border: '1px solid hsl(215 27.9% 16.9%)',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(263 70% 50%)',
                  secondary: 'white',
                },
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}

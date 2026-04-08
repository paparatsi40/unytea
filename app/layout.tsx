import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Unytea - Where Communities Unite",
    template: "%s | Unytea",
  },
  description:
    "Build and grow thriving communities with features that bring people together. Video calls, courses, gamification, and more - all in one warm, human platform.",
  keywords: [
    "community platform",
    "online communities",
    "community building",
    "video calls",
    "courses",
    "gamification",
    "buddy system",
  ],
  authors: [{ name: "Unytea Team" }],
  creator: "Unytea",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Unytea",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://unytea.com",
    title: "Unytea - Where Communities Unite",
    description:
      "The community platform with soul. Better features, better design, better price than Skool.",
    siteName: "Unytea",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unytea - Where Communities Unite",
    description:
      "The community platform with soul. Better features, better design, better price than Skool.",
    creator: "@unytea",
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

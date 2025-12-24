// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "@uploadthing/react/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Unytea - Mentoring & Community",
    template: "%s | Unytea",
  },
  description:
    "Where Mentors & Mentees Unite. Build meaningful connections, learn together, and grow through mentorship in engaged communities.",
  keywords: [
    "mentoring",
    "community",
    "learning",
    "mentorship",
    "education",
    "professional development",
    "peer learning",
    "online courses",
    "video mentoring",
  ],
  authors: [{ name: "Unytea" }],
  creator: "Unytea",
  publisher: "Unytea",
  
  // Favicons and Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  
  // Web App Manifest
  manifest: "/site.webmanifest",
  
  // Open Graph (for social media sharing)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    title: "Unytea - Mentoring & Community",
    description: "Where Mentors & Mentees Unite. Build meaningful connections and grow through mentorship.",
    siteName: "Unytea",
    images: [
      {
        url: "/branding/cover/unytea-cover.jpg",
        width: 1500,
        height: 500,
        alt: "Unytea - Mentoring & Community Platform",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Unytea - Mentoring & Community",
    description: "Where Mentors & Mentees Unite. Build meaningful connections and grow through mentorship.",
    images: ["/branding/cover/unytea-cover.jpg"],
    creator: "@unytea",
  },
  
  // Verification (for production)
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  
  // App-specific
  applicationName: "Unytea",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Unytea",
  },
  formatDetection: {
    telephone: false,
  },
};

// Viewport configuration (separate from metadata in Next.js 15+)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6B2D8F" },
    { media: "(prefers-color-scheme: dark)", color: "#9B59B6" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head />
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

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
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <SessionProvider>
            {children}
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

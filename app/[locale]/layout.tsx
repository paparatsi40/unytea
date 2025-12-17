// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { locales } from "@/i18n";
import { Providers } from "@/components/providers/Providers";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  
  return {
    title: {
      default: "Unytea - Mentoring & Community",
      template: "%s | Unytea",
    },
    description: "Where Mentors & Mentees Unite. Build meaningful connections, learn together, and grow through mentorship in engaged communities.",
    applicationName: "Unytea",
    keywords: ["mentoring", "community", "learning", "mentorship", "education"],
    authors: [{ name: "Unytea" }],
    creator: "Unytea",
    publisher: "Unytea",
    icons: {
      icon: "/favicon.ico",
    },
    openGraph: {
      title: "Unytea - Mentoring & Community",
      description: "Where Mentors & Mentees Unite",
      siteName: "Unytea",
      locale: locale,
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // En Next.js 15+, params es una Promise
  const { locale } = await params;
  
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // NextIntlClientProvider hereda automáticamente la configuración
  // desde i18n.ts cuando usamos getRequestConfig
  // No necesitamos pasar messages manualmente aquí
  
  return (
    <NextIntlClientProvider locale={locale}>
      <Providers>
        {children}
      </Providers>
    </NextIntlClientProvider>
  );
}

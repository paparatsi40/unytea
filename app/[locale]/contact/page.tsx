import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

const SUPPORT_EMAIL = "support@unytea.com";
const SUPPORTED_LOCALES = ["en", "es", "fr"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Minimal contact page. Search Console flagged /es/contact as 404 — the URL
 * had been discovered (likely from an old footer or external link) but no
 * page existed. Rather than 301-redirect or strip from Google's index, we
 * serve real content: visitors who land here get a clear way to reach us,
 * and the page reinforces basic trust signals (E-E-A-T) for SEO.
 */

const COPY: Record<
  SupportedLocale,
  {
    eyebrow: string;
    heading: string;
    body: string;
    emailLabel: string;
    metaTitle: string;
    metaDescription: string;
  }
> = {
  en: {
    eyebrow: "Contact",
    heading: "Get in touch",
    body:
      "Have a question, feedback, or a partnership idea? We read every message and reply within one business day.",
    emailLabel: "Email us at",
    metaTitle: "Contact Unytea",
    metaDescription:
      "Reach the Unytea team for support, partnerships, or general questions. We reply within one business day.",
  },
  es: {
    eyebrow: "Contacto",
    heading: "Hablemos",
    body:
      "¿Tienes una pregunta, comentario o idea de colaboración? Leemos cada mensaje y respondemos en un día hábil.",
    emailLabel: "Escríbenos a",
    metaTitle: "Contacto · Unytea",
    metaDescription:
      "Contacta al equipo de Unytea para soporte, colaboraciones o consultas. Respondemos en un día hábil.",
  },
  fr: {
    eyebrow: "Contact",
    heading: "Discutons",
    body:
      "Une question, un retour, ou une idée de partenariat ? Nous lisons chaque message et répondons sous un jour ouvré.",
    emailLabel: "Écrivez-nous à",
    metaTitle: "Contact · Unytea",
    metaDescription:
      "Contactez l'équipe Unytea pour du support, des partenariats ou des questions. Réponse sous un jour ouvré.",
  },
};

function resolveLocale(value: string): SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as SupportedLocale)
    : "en";
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const t = COPY[locale];

  const baseUrl = "https://www.unytea.com";
  const path = "/contact";

  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical: `${baseUrl}/${locale}${path}`,
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((l) => [l, `${baseUrl}/${l}${path}`])
      ),
    },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      url: `${baseUrl}/${locale}${path}`,
      type: "website",
    },
  };
}

export default function ContactPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  setRequestLocale(locale);
  const t = COPY[locale];

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10">
          <p className="text-sm text-muted-foreground mb-2">{t.eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight">{t.heading}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t.body}</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-2xl">
          <p className="text-base text-foreground">
            {t.emailLabel}{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

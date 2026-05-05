import type { Metadata } from "next";
import Link from "next/link";
import { localizedAlternates } from "@/lib/seo/locale-metadata";

const META = {
  title: "Cookie Policy | Unytea",
  description:
    "Understand how Unytea uses cookies and similar technologies across our platform.",
};

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return {
    title: META.title,
    description: META.description,
    openGraph: {
      title: META.title,
      description: META.description,
    },
    ...localizedAlternates({ path: "/cookies", locale: params.locale }),
  };
}

export default function CookiesPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10">
          <p className="text-sm text-muted-foreground mb-2">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            This policy explains how Unytea uses cookies and similar
            technologies to improve functionality, security, and user
            experience.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: April 2026
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl space-y-8">
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              1. What Are Cookies
            </h2>
            <p className="text-muted-foreground mb-2">
              Cookies are small text files placed on your device when you visit a
              website. They help the site remember your preferences, keep you
              signed in, and understand how you interact with the platform.
            </p>
            <p className="text-muted-foreground">
              Similar technologies include local storage, session storage, and
              pixel tags, which serve comparable purposes. References to
              &ldquo;cookies&rdquo; in this policy include all such
              technologies.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              2. Cookies We Use
            </h2>

            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-sm mb-1">
                  Strictly Necessary
                </h3>
                <p className="text-sm text-muted-foreground">
                  Required for authentication, session management, security
                  protections (CSRF tokens), and core platform operation. These
                  cannot be disabled without breaking the service.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-sm mb-1">Functional</h3>
                <p className="text-sm text-muted-foreground">
                  Remember your language preference, theme setting, and interface
                  customizations. These improve your experience but are not
                  strictly required.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-sm mb-1">
                  Performance &amp; Analytics
                </h3>
                <p className="text-sm text-muted-foreground">
                  Help us understand how users interact with the platform — which
                  pages are most visited, where errors occur, and how features
                  are used. This data is aggregated and does not identify
                  individual users.
                </p>
              </div>
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              3. Third-Party Cookies
            </h2>
            <p className="text-muted-foreground mb-2">
              Some integrated services may set cookies under their own domains.
              These include:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Payment processing:
              </strong>{" "}
              Our payment provider may set cookies for fraud detection and secure
              checkout functionality.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Video sessions:</strong> Our
              video infrastructure provider may use cookies or local storage to
              manage session quality and connectivity.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">
                Authentication providers:
              </strong>{" "}
              If you sign in through a social login (Google, GitHub), the
              identity provider may set their own cookies during the
              authentication flow.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              4. Cookie Duration
            </h2>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Session cookies</strong> are
              temporary and deleted when you close your browser. These are used
              primarily for authentication and security.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Persistent cookies</strong>{" "}
              remain on your device for a set period (typically 30 days to 1
              year) or until you delete them. These are used for preferences and
              analytics.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              5. Managing Cookies
            </h2>
            <p className="text-muted-foreground mb-2">
              You can control cookies through your browser settings. Most
              browsers allow you to view, delete, and block cookies from specific
              or all websites.
            </p>
            <p className="text-muted-foreground mb-2">
              Please note that blocking strictly necessary cookies will prevent
              you from signing in and using core platform features. Blocking
              functional cookies may affect your personalization preferences.
            </p>
            <p className="text-muted-foreground">
              For instructions on managing cookies in your browser, visit your
              browser&apos;s help documentation or settings page.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              6. Do Not Track
            </h2>
            <p className="text-muted-foreground">
              Some browsers send a &ldquo;Do Not Track&rdquo; signal. There is
              no universal standard for how websites should respond to this
              signal. We do not currently alter our data collection practices
              based on DNT signals, but we do not engage in cross-site user
              tracking.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              7. Updates to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy as our platform evolves or as
              regulatory requirements change. Material changes will be
              communicated through the platform.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground">
              For cookie-related questions, contact us at{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:privacy@unytea.com"
              >
                privacy@unytea.com
              </a>
              .
            </p>
          </article>

          <div className="pt-4">
            <Link
              href={`/${locale}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

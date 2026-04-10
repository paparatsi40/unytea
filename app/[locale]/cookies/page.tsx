import Link from "next/link";

export default function CookiesPage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10">
          <p className="text-sm text-muted-foreground mb-2">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            This policy explains how Unytea uses cookies and similar technologies to improve functionality, security, and user experience.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl space-y-8">
          <article>
            <h2 className="text-2xl font-semibold mb-3">1. What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small text files placed on your device to remember preferences, improve performance, and support secure sessions.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">2. How We Use Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies for authentication, security, session continuity, feature settings, and aggregated analytics.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">3. Cookie Categories</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Strictly necessary cookies (required for core platform operation)</li>
              <li>Performance and analytics cookies</li>
              <li>Preference cookies (language, interface settings)</li>
            </ul>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              Some integrated services (e.g., payments and analytics providers) may set cookies under their own policies.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">5. Managing Cookies</h2>
            <p className="text-muted-foreground">
              You can control cookies via browser settings. Disabling some cookies may affect product functionality and account experience.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">6. Contact</h2>
            <p className="text-muted-foreground">
              For cookie-related questions, contact <a className="text-primary hover:underline" href="mailto:privacy@unytea.com">privacy@unytea.com</a>.
            </p>
          </article>

          <div className="pt-4">
            <Link href={`/${locale}`} className="text-sm font-medium text-primary hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

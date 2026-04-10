import Link from "next/link";

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10">
          <p className="text-sm text-muted-foreground mb-2">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            This Privacy Policy explains how Unytea collects, uses, stores, and protects personal data when you use our platform.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl space-y-8">
          <article>
            <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We may collect account information, profile details, billing metadata, usage analytics, content you publish, and communications necessary to provide the service.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">2. How We Use Information</h2>
            <p className="text-muted-foreground">
              We use data to operate the platform, provide customer support, improve product quality, prevent abuse, process payments, and comply with legal obligations.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">3. Payment and Billing Data</h2>
            <p className="text-muted-foreground">
              Payments are processed through third-party providers (such as Stripe). Unytea does not store full card numbers. We receive limited billing metadata needed for subscription management and invoicing.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground">
              We may share data with trusted service providers strictly for hosting, analytics, messaging, and payments. We do not sell personal data.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain data while your account is active and as needed for legal, accounting, fraud prevention, and security purposes.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">6. Security</h2>
            <p className="text-muted-foreground">
              We use technical and organizational safeguards to protect data, but no internet transmission or storage is fully secure.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground">
              Depending on your location, you may have rights to access, correct, delete, or export your data, and to object to certain processing.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground">
              For privacy requests, contact us at <a className="text-primary hover:underline" href="mailto:privacy@unytea.com">privacy@unytea.com</a>.
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

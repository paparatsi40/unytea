import Link from "next/link";

export default function TermsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10">
          <p className="text-sm text-muted-foreground mb-2">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            These Terms govern your access to and use of Unytea. By using the platform, you agree to these terms.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl space-y-8">
          <article>
            <h2 className="text-2xl font-semibold mb-3">1. Platform Use</h2>
            <p className="text-muted-foreground">
              You agree to use Unytea in compliance with applicable laws and in a way that does not abuse, disrupt, or compromise the platform or other users.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">2. Accounts and Responsibility</h2>
            <p className="text-muted-foreground">
              You are responsible for your account credentials and for all activity under your account. Keep credentials secure and notify us if unauthorized use occurs.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">3. Billing and Subscriptions</h2>
            <p className="text-muted-foreground">
              Paid features are billed according to your selected plan. Subscription renewals, cancellations, and refunds follow your plan terms and payment provider policies.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">4. Content and Community Management</h2>
            <p className="text-muted-foreground">
              You retain rights to your content, but grant Unytea a limited license to host and display it for service operation. You must have rights to all uploaded content.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground">
              Prohibited conduct includes unlawful content, hate speech, harassment, spam, fraud, malware distribution, and attempts to bypass security controls.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">6. Suspension and Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate access for violations of these Terms, legal requirements, or platform safety concerns.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Unytea is not liable for indirect, incidental, or consequential damages arising from use of the service.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground">
              For legal questions, contact <a className="text-primary hover:underline" href="mailto:legal@unytea.com">legal@unytea.com</a>.
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

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Unytea",
  description:
    "Read the terms that govern your use of the Unytea community-based learning platform.",
  openGraph: {
    title: "Terms of Service | Unytea",
    description:
      "Read the terms that govern your use of the Unytea community-based learning platform.",
  },
};

export default function TermsPage({
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
          <h1 className="text-4xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            These Terms govern your access to and use of Unytea. By using the
            platform, you agree to these terms.
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
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground mb-2">
              By creating an account or accessing the Unytea platform, you agree
              to be bound by these Terms of Service, our Privacy Policy, and our
              Cookie Policy. If you do not agree, do not use the service.
            </p>
            <p className="text-muted-foreground">
              We may modify these Terms at any time. Material changes will be
              communicated through the platform or by email at least 14 days
              before taking effect. Continued use after changes constitutes
              acceptance.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              2. Eligibility and Accounts
            </h2>
            <p className="text-muted-foreground mb-2">
              You must be at least 16 years old to use Unytea. By registering,
              you represent that you meet this requirement and that all
              information you provide is accurate.
            </p>
            <p className="text-muted-foreground">
              You are responsible for maintaining the security of your account
              credentials and for all activity that occurs under your account.
              Notify us immediately at{" "}
              <a
                href="mailto:security@unytea.com"
                className="text-primary hover:underline"
              >
                security@unytea.com
              </a>{" "}
              if you suspect unauthorized access.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              3. Platform Description
            </h2>
            <p className="text-muted-foreground">
              Unytea provides tools for community-based learning, including
              community creation and management, structured courses, live video
              sessions, real-time messaging, collaborative whiteboards, content
              publishing, AI-assisted features, and integrated payment
              processing. Feature availability may vary by plan.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              4. Content Ownership and License
            </h2>
            <p className="text-muted-foreground mb-2">
              You retain full ownership of content you create and publish on
              Unytea. By posting content, you grant Unytea a worldwide,
              non-exclusive, royalty-free license to host, display, reproduce,
              and distribute your content solely as necessary to operate and
              improve the platform.
            </p>
            <p className="text-muted-foreground">
              You represent that you have all necessary rights to the content you
              upload and that it does not infringe the intellectual property or
              other rights of any third party.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              5. Community Creators
            </h2>
            <p className="text-muted-foreground mb-2">
              If you create and operate a community on Unytea, you are
              responsible for the content published within it, the conduct of
              your members, and compliance with applicable laws regarding the
              services you offer.
            </p>
            <p className="text-muted-foreground">
              Community creators who accept payments through the platform agree
              to the payment provider&apos;s terms (including Stripe Connected
              Account terms) and acknowledge that Unytea may retain platform
              fees as described in the applicable pricing plan.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              6. Billing, Subscriptions, and Refunds
            </h2>
            <p className="text-muted-foreground mb-2">
              Paid features are billed according to your selected plan on a
              recurring basis. You authorize us to charge your payment method for
              all applicable fees. Subscription renewals occur automatically
              unless cancelled before the renewal date.
            </p>
            <p className="text-muted-foreground">
              Refund eligibility is determined on a case-by-case basis. Requests
              should be submitted within 14 days of the charge. Platform fees
              and transaction processing fees are generally non-refundable.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">7. Acceptable Use</h2>
            <p className="text-muted-foreground mb-3">
              You agree not to use Unytea for any purpose that is unlawful or
              prohibited by these Terms. Specifically, you must not:
            </p>
            <p className="text-muted-foreground mb-2">
              Post content that is defamatory, obscene, threatening, or that
              promotes violence, discrimination, or illegal activity.
            </p>
            <p className="text-muted-foreground mb-2">
              Harass, bully, impersonate, or intimidate other users.
            </p>
            <p className="text-muted-foreground mb-2">
              Distribute spam, malware, phishing links, or unsolicited
              commercial content.
            </p>
            <p className="text-muted-foreground mb-2">
              Attempt to gain unauthorized access to other accounts, platform
              systems, or data.
            </p>
            <p className="text-muted-foreground mb-2">
              Scrape, crawl, or use automated tools to access the platform
              without written permission.
            </p>
            <p className="text-muted-foreground">
              Circumvent security measures, rate limits, or access controls.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              8. Content Moderation and Reporting
            </h2>
            <p className="text-muted-foreground mb-2">
              Unytea reserves the right to review, flag, or remove content that
              violates these Terms or our community guidelines. We also provide
              tools for users to report content that they believe is
              inappropriate or harmful.
            </p>
            <p className="text-muted-foreground">
              We use a combination of automated systems and human review for
              moderation. Community creators may also set their own moderation
              rules within the boundaries of these Terms.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              9. AI-Powered Features
            </h2>
            <p className="text-muted-foreground">
              Certain platform features use artificial intelligence, including
              content recommendations, chat assistance, and automated
              moderation. AI-generated outputs are provided as suggestions and
              should not be relied upon as professional advice. We are not
              responsible for decisions made based on AI-generated content.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              10. Suspension and Termination
            </h2>
            <p className="text-muted-foreground mb-2">
              We may suspend or terminate your access if you violate these
              Terms, if required by law, or if necessary to protect the safety
              and integrity of the platform and its users.
            </p>
            <p className="text-muted-foreground">
              You may delete your account at any time through your account
              settings. Upon termination, your right to use the platform ceases
              immediately. Data deletion follows the timeline described in our
              Privacy Policy.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              11. Disclaimer of Warranties
            </h2>
            <p className="text-muted-foreground">
              The platform is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, express or
              implied. We do not guarantee that the service will be
              uninterrupted, error-free, or secure at all times.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              12. Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Unytea and its team shall
              not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of the
              platform. Our total liability shall not exceed the amount you paid
              us in the 12 months preceding the claim.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              13. Governing Law
            </h2>
            <p className="text-muted-foreground">
              These Terms are governed by applicable law. Any disputes arising
              from these Terms or the use of the platform shall be resolved
              through binding arbitration or in the courts of competent
              jurisdiction, as determined by the applicable laws of your region.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">14. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:legal@unytea.com"
              >
                legal@unytea.com
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

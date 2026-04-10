import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Unytea",
  description:
    "Learn how Unytea collects, uses, and protects your personal data across our community-based learning platform.",
  openGraph: {
    title: "Privacy Policy | Unytea",
    description:
      "Learn how Unytea collects, uses, and protects your personal data across our community-based learning platform.",
  },
};

export default function PrivacyPage({
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
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            This Privacy Policy explains how Unytea collects, uses, stores, and
            protects personal data when you use our platform.
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
              1. Information We Collect
            </h2>
            <p className="text-muted-foreground mb-3">
              We collect information you provide directly and data generated
              through your use of the platform. This includes:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Account data:</strong> name,
              email address, profile picture, and authentication credentials
              (managed through our identity provider).
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Profile data:</strong>{" "}
              biography, interests, community memberships, and publicly visible
              activity within communities you join.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Content data:</strong> posts,
              comments, course progress, messages, uploaded files, whiteboard
              sessions, and any other content you create on the platform.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Usage data:</strong> pages
              visited, features used, session duration, device type, browser
              information, IP address, and general location derived from IP.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">
                Communication data:
              </strong>{" "}
              support requests, feedback, and any messages you send through the
              platform&apos;s real-time chat features.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              2. How We Use Information
            </h2>
            <p className="text-muted-foreground mb-3">
              We process your data to operate and improve the platform. Specific
              purposes include:
            </p>
            <p className="text-muted-foreground mb-2">
              Providing core services such as community access, course delivery,
              live video sessions, real-time messaging, and content
              collaboration tools.
            </p>
            <p className="text-muted-foreground mb-2">
              Personalizing your experience through AI-powered features,
              including content recommendations and moderation assistance. These
              features use third-party AI services that process content in
              accordance with their own privacy policies.
            </p>
            <p className="text-muted-foreground mb-2">
              Processing payments, managing subscriptions, generating invoices,
              and facilitating creator payouts through our payment
              infrastructure.
            </p>
            <p className="text-muted-foreground mb-2">
              Enforcing platform policies, detecting abuse, preventing fraud,
              and maintaining the security and integrity of the service.
            </p>
            <p className="text-muted-foreground">
              Communicating with you about account activity, security alerts,
              product updates, and (with your consent) promotional content.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              3. Third-Party Services and Data Sharing
            </h2>
            <p className="text-muted-foreground mb-3">
              We integrate with trusted third-party providers to deliver
              platform functionality. Each provider receives only the minimum
              data required for their service:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Payment processing:</strong>{" "}
              billing data is handled by Stripe. We do not store full card
              numbers. Stripe processes payment information under its own privacy
              policy and PCI DSS compliance.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Video sessions:</strong> live
              video and audio streams are processed by our video infrastructure
              provider for the duration of each session.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Real-time messaging:</strong>{" "}
              chat messages are transmitted through our real-time messaging
              provider to enable instant delivery.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">AI features:</strong> content
              submitted to AI-powered features (chat assistance, moderation,
              recommendations) is processed by third-party AI providers. We do
              not use your content to train AI models.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">File storage:</strong>{" "}
              uploaded images and files are stored through our cloud storage
              provider with access controls.
            </p>
            <p className="text-muted-foreground">
              We do not sell personal data to third parties. We may share data
              when required by law or to protect the safety of our users and
              platform.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              4. Data Retention
            </h2>
            <p className="text-muted-foreground mb-2">
              We retain your data for as long as your account is active and as
              needed to provide services. After account deletion, we remove
              personal data within 30 days, except where retention is required
              for legal compliance, fraud prevention, financial record-keeping,
              or dispute resolution.
            </p>
            <p className="text-muted-foreground">
              Anonymized and aggregated data that cannot identify you may be
              retained indefinitely for analytics and product improvement
              purposes.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">5. Security</h2>
            <p className="text-muted-foreground mb-2">
              We implement technical and organizational measures to protect your
              data, including encrypted connections (TLS/SSL), secure
              authentication flows, role-based access controls, and rate
              limiting on sensitive endpoints.
            </p>
            <p className="text-muted-foreground">
              While we take reasonable steps to protect your information, no
              method of transmission over the internet or electronic storage is
              completely secure. We encourage you to use strong, unique passwords
              and enable available security features on your account.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              6. International Data Transfers
            </h2>
            <p className="text-muted-foreground">
              Your data may be processed in countries other than your own. Our
              service providers operate globally, and we ensure that appropriate
              safeguards are in place when transferring data across borders,
              including standard contractual clauses where applicable.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              7. Children&apos;s Privacy
            </h2>
            <p className="text-muted-foreground">
              Unytea is not directed at individuals under the age of 16. We do
              not knowingly collect personal data from children. If you believe a
              child has provided us with personal information, please contact us
              so we can take appropriate action.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground mb-2">
              Depending on your jurisdiction, you may have the right to: access
              the personal data we hold about you, request correction of
              inaccurate data, request deletion of your data, object to or
              restrict certain processing, request data portability in a
              machine-readable format, and withdraw consent where processing is
              based on consent.
            </p>
            <p className="text-muted-foreground">
              To exercise any of these rights, contact us at the address below.
              We will respond within 30 days or as required by applicable law.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">
              9. Changes to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. Material
              changes will be communicated through the platform or by email. Your
              continued use of the service after changes take effect constitutes
              acceptance of the revised policy.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground">
              For privacy requests or questions about this policy, contact us at{" "}
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

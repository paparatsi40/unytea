import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Unytea",
  description:
    "Learn how Unytea collects, uses, and protects your personal data in compliance with GDPR and international privacy regulations.",
  openGraph: {
    title: "Privacy Policy | Unytea",
    description:
      "Learn how Unytea collects, uses, and protects your personal data in compliance with GDPR and international privacy regulations.",
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
            This Privacy Policy explains how Unytea (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, stores, and
            protects personal data when you use our platform. We are committed
            to complying with the General Data Protection Regulation (GDPR), the
            California Consumer Privacy Act (CCPA), and other applicable data
            protection laws.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: April 2026
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl space-y-8">
          {/* Section 1 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              1. Data Controller
            </h2>
            <p className="text-muted-foreground mb-2">
              Unytea acts as the data controller for the personal data collected
              through this platform. This means we determine the purposes and
              means of processing your personal data.
            </p>
            <p className="text-muted-foreground">
              For all data protection inquiries, you may contact our Data
              Protection Officer at{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:dpo@unytea.com"
              >
                dpo@unytea.com
              </a>
              .
            </p>
          </article>

          {/* Section 2 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              2. Information We Collect
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

          {/* Section 3 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              3. Legal Basis for Processing (GDPR)
            </h2>
            <p className="text-muted-foreground mb-3">
              Under the GDPR, we process your personal data based on the
              following legal grounds:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Contractual necessity (Art. 6(1)(b)):
              </strong>{" "}
              processing required to provide you with our services — account
              creation, community access, course delivery, live sessions,
              messaging, payments, and subscription management.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Consent (Art. 6(1)(a)):
              </strong>{" "}
              processing based on your explicit opt-in — analytics cookies,
              marketing communications, and optional AI-powered personalization
              features. You may withdraw consent at any time without affecting
              the lawfulness of prior processing.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Legitimate interest (Art. 6(1)(f)):
              </strong>{" "}
              processing necessary for our legitimate business interests —
              platform security, fraud prevention, abuse detection, service
              improvement, and aggregated analytics. We conduct balancing tests
              to ensure these interests do not override your fundamental rights.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">
                Legal obligation (Art. 6(1)(c)):
              </strong>{" "}
              processing required to comply with applicable laws — financial
              record-keeping, tax reporting, and responding to lawful government
              requests.
            </p>
          </article>

          {/* Section 4 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              4. How We Use Information
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

          {/* Section 5 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              5. Third-Party Services and Data Sharing
            </h2>
            <p className="text-muted-foreground mb-3">
              We integrate with trusted third-party providers (sub-processors)
              to deliver platform functionality. Each provider receives only the
              minimum data required for their service and is bound by data
              processing agreements:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">Payment processing:</strong>{" "}
              billing data is handled by Stripe. We do not store full card
              numbers. Stripe processes payment information under its own privacy
              policy, PCI DSS compliance, and acts as an independent data
              controller for fraud prevention.
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
              platform. A complete list of sub-processors is available upon
              request at{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:dpo@unytea.com"
              >
                dpo@unytea.com
              </a>
              .
            </p>
          </article>

          {/* Section 6 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              6. International Data Transfers
            </h2>
            <p className="text-muted-foreground mb-2">
              Your data may be processed in countries outside the European
              Economic Area (EEA). When we transfer personal data outside the
              EEA, we ensure appropriate safeguards are in place:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Adequacy decisions:
              </strong>{" "}
              transfers to countries recognized by the European Commission as
              providing adequate data protection.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Standard Contractual Clauses (SCCs):
              </strong>{" "}
              EU-approved contractual terms that bind the data importer to
              protect your data to European standards.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">
                EU-U.S. Data Privacy Framework:
              </strong>{" "}
              where applicable, transfers to U.S. providers certified under the
              Data Privacy Framework.
            </p>
          </article>

          {/* Section 7 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              7. Data Retention
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

          {/* Section 8 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">8. Security</h2>
            <p className="text-muted-foreground mb-2">
              We implement technical and organizational measures to protect your
              data, including encrypted connections (TLS/SSL), secure
              authentication flows, role-based access controls, rate limiting on
              sensitive endpoints, and regular security audits.
            </p>
            <p className="text-muted-foreground">
              While we take reasonable steps to protect your information, no
              method of transmission over the internet or electronic storage is
              completely secure. In the event of a data breach affecting your
              personal data, we will notify the relevant supervisory authority
              within 72 hours as required by GDPR Article 33, and will notify
              affected individuals without undue delay when the breach poses a
              high risk to their rights and freedoms.
            </p>
          </article>

          {/* Section 9 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-muted-foreground">
              Unytea is not directed at individuals under the age of 16. We do
              not knowingly collect personal data from children. If you believe a
              child has provided us with personal information, please contact us
              so we can take appropriate action to delete such data.
            </p>
          </article>

          {/* Section 10 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              10. Your Rights Under GDPR
            </h2>
            <p className="text-muted-foreground mb-3">
              If you are located in the European Economic Area, you have the
              following rights under GDPR:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Right of access (Art. 15):
              </strong>{" "}
              request a copy of the personal data we hold about you.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Right to rectification (Art. 16):
              </strong>{" "}
              request correction of inaccurate or incomplete personal data.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Right to erasure (Art. 17):
              </strong>{" "}
              request deletion of your personal data (&ldquo;right to be
              forgotten&rdquo;).
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Right to restrict processing (Art. 18):
              </strong>{" "}
              request that we limit how we process your data in certain
              circumstances.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Right to data portability (Art. 20):
              </strong>{" "}
              receive your personal data in a structured, commonly used,
              machine-readable format.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Right to object (Art. 21):
              </strong>{" "}
              object to processing based on legitimate interests, including
              profiling.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Right to withdraw consent (Art. 7(3)):
              </strong>{" "}
              withdraw consent at any time where processing is based on consent,
              without affecting the lawfulness of prior processing.
            </p>
            <p className="text-muted-foreground">
              To exercise any of these rights, contact us at{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:dpo@unytea.com"
              >
                dpo@unytea.com
              </a>
              . We will respond within 30 days as required by GDPR Article 12.
            </p>
          </article>

          {/* Section 11 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              11. Your Rights Under CCPA
            </h2>
            <p className="text-muted-foreground mb-3">
              If you are a California resident, you have additional rights under
              the California Consumer Privacy Act:
            </p>
            <p className="text-muted-foreground mb-2">
              The right to know what personal information is collected, used,
              shared, or sold.
            </p>
            <p className="text-muted-foreground mb-2">
              The right to delete personal information held by us and our
              service providers.
            </p>
            <p className="text-muted-foreground mb-2">
              The right to opt-out of the sale of personal information. We do
              not sell your personal information.
            </p>
            <p className="text-muted-foreground">
              The right to non-discrimination for exercising your CCPA rights.
            </p>
          </article>

          {/* Section 12 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              12. Automated Decision-Making
            </h2>
            <p className="text-muted-foreground">
              We use automated systems for content moderation and
              recommendation features. These systems assist in flagging
              potentially harmful content and suggesting relevant communities or
              courses. No automated decisions are made that produce legal or
              similarly significant effects on you without human review. You have
              the right to request human intervention in any automated decision
              that affects you.
            </p>
          </article>

          {/* Section 13 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              13. Right to Lodge a Complaint
            </h2>
            <p className="text-muted-foreground">
              If you believe that we have not adequately addressed your data
              protection concerns, you have the right to lodge a complaint with
              your local data protection supervisory authority. A list of EU
              supervisory authorities is available at{" "}
              <a
                className="text-primary hover:underline"
                href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
                target="_blank"
                rel="noopener noreferrer"
              >
                edpb.europa.eu
              </a>
              .
            </p>
          </article>

          {/* Section 14 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">
              14. Changes to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. Material
              changes will be communicated through the platform or by email at
              least 14 days before taking effect. Your continued use of the
              service after changes take effect constitutes acceptance of the
              revised policy. Previous versions of this policy are available upon
              request.
            </p>
          </article>

          {/* Section 15 */}
          <article>
            <h2 className="text-2xl font-semibold mb-3">15. Contact</h2>
            <p className="text-muted-foreground mb-2">
              For privacy requests or questions about this policy:
            </p>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Data Protection Officer:
              </strong>{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:dpo@unytea.com"
              >
                dpo@unytea.com
              </a>
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">General privacy:</strong>{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:privacy@unytea.com"
              >
                privacy@unytea.com
              </a>
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

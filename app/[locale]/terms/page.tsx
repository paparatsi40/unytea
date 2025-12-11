import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Unytea",
  description: "Terms and conditions for using Unytea platform",
};

export default function TermsPage() {
  const lastUpdated = "January 11, 2025";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing or using Unytea ("Platform," "Service," "we," "us," or "our"), you agree to be bound
              by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Platform.
            </p>
            <p className="text-muted-foreground mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes.
              Your continued use of the Platform after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              Unytea is a community platform that provides:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Community creation and management tools</li>
              <li>Video conferencing and live sessions</li>
              <li>Course creation and learning management</li>
              <li>Direct messaging and group chat</li>
              <li>Content sharing and collaboration features</li>
              <li>Buddy system for member matching</li>
              <li>Analytics and reporting tools</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold mb-3">3.1 Account Creation</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>You must be at least 13 years old to create an account</li>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining account security</li>
              <li>You may not share your account credentials</li>
              <li>One person may not maintain multiple accounts without authorization</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.2 Account Termination</h3>
            <p className="text-muted-foreground mb-4">
              We reserve the right to suspend or terminate accounts that violate these Terms, at our sole discretion,
              without notice or liability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. User Conduct</h2>
            <p className="text-muted-foreground mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Post harmful, offensive, or inappropriate content</li>
              <li>Harass, bully, or threaten other users</li>
              <li>Spam or send unsolicited commercial messages</li>
              <li>Attempt to gain unauthorized access to the Platform</li>
              <li>Upload viruses or malicious code</li>
              <li>Scrape or copy content without permission</li>
              <li>Impersonate others or misrepresent affiliation</li>
              <li>Interfere with Platform operations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Content</h2>
            
            <h3 className="text-xl font-semibold mb-3">5.1 Your Content</h3>
            <p className="text-muted-foreground mb-4">
              You retain ownership of content you post ("Your Content"). By posting content, you grant Unytea a
              worldwide, non-exclusive, royalty-free license to use, display, and distribute Your Content on the Platform.
            </p>

            <h3 className="text-xl font-semibold mb-3">5.2 Content Responsibility</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>You are solely responsible for Your Content</li>
              <li>You must have rights to all content you post</li>
              <li>We may remove content that violates these Terms</li>
              <li>We do not endorse user-generated content</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.3 Copyright Policy</h3>
            <p className="text-muted-foreground mb-4">
              We respect intellectual property rights. If you believe content infringes your copyright, contact us at{" "}
              <a href="mailto:copyright@unytea.com" className="text-primary hover:underline">
                copyright@unytea.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Payments and Subscriptions</h2>
            
            <h3 className="text-xl font-semibold mb-3">6.1 Pricing</h3>
            <p className="text-muted-foreground mb-4">
              Subscription plans and pricing are available on our website. Prices are subject to change with 30 days notice.
            </p>

            <h3 className="text-xl font-semibold mb-3">6.2 Billing</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Subscriptions are billed monthly or annually</li>
              <li>Payment is processed through Stripe</li>
              <li>You authorize recurring charges</li>
              <li>Usage overage charges apply as specified in your plan</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">6.3 Refunds</h3>
            <p className="text-muted-foreground mb-4">
              We offer a 14-day free trial. After that, subscriptions are non-refundable except as required by law
              or at our sole discretion.
            </p>

            <h3 className="text-xl font-semibold mb-3">6.4 Cancellation</h3>
            <p className="text-muted-foreground mb-4">
              You may cancel your subscription at any time. Cancellation takes effect at the end of your current
              billing period. No prorated refunds are provided.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Community Payments</h2>
            <p className="text-muted-foreground mb-4">
              Community owners may charge for memberships or content:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Payments are processed through Stripe Connect</li>
              <li>Unytea does not charge transaction fees (Stripe fees apply)</li>
              <li>Community owners are responsible for tax compliance</li>
              <li>Payout schedule: 2-day rolling basis (Stripe standard)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Privacy</h2>
            <p className="text-muted-foreground mb-4">
              Your privacy is important to us. Please review our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              {" "}to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              The Platform, including its design, code, features, and branding, is owned by Unytea and protected by
              copyright, trademark, and other intellectual property laws. You may not copy, modify, or reverse engineer
              any part of the Platform without express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Disclaimers</h2>
            <p className="text-muted-foreground mb-4">
              THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
              LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>We do not guarantee uninterrupted or error-free service</li>
              <li>We are not responsible for user-generated content</li>
              <li>We do not guarantee any specific results from using the Platform</li>
              <li>Third-party services (LiveKit, Stripe, etc.) are subject to their own terms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, UNYTEA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
              DIRECTLY OR INDIRECTLY.
            </p>
            <p className="text-muted-foreground mb-4">
              Our total liability for any claim arising from these Terms or the Platform shall not exceed the amount
              you paid us in the 12 months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Indemnification</h2>
            <p className="text-muted-foreground mb-4">
              You agree to indemnify and hold harmless Unytea, its officers, directors, employees, and agents from
              any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Your use of the Platform</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your Content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">13. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold mb-3">13.1 Governing Law</h3>
            <p className="text-muted-foreground mb-4">
              These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold mb-3">13.2 Arbitration</h3>
            <p className="text-muted-foreground mb-4">
              Any disputes shall be resolved through binding arbitration in accordance with the rules of [Arbitration Organization].
              You waive the right to participate in class actions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">14. General Provisions</h2>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>Severability:</strong> If any provision is found invalid, the remaining provisions remain in effect</li>
              <li><strong>No Waiver:</strong> Our failure to enforce any right doesn't waive that right</li>
              <li><strong>Assignment:</strong> You may not transfer these Terms; we may assign them freely</li>
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Unytea</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms, contact us:
            </p>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-foreground mb-2"><strong>Unytea</strong></p>
              <p className="text-muted-foreground">Email: <a href="mailto:legal@unytea.com" className="text-primary hover:underline">legal@unytea.com</a></p>
              <p className="text-muted-foreground">Support: <a href="mailto:support@unytea.com" className="text-primary hover:underline">support@unytea.com</a></p>
              <p className="text-muted-foreground">Website: <a href="https://unytea.com" className="text-primary hover:underline">unytea.com</a></p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              By using Unytea, you acknowledge that you have read, understood, and agree to be bound by these
              Terms of Service.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Effective date: {lastUpdated}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

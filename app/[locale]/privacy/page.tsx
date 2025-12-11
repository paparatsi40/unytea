import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Unytea",
  description: "How we collect, use, and protect your personal information",
};

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to Unytea ("we," "our," or "us"). We are committed to protecting your personal information
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our platform at unytea.com (the "Platform").
            </p>
            <p className="text-muted-foreground mb-4">
              By using Unytea, you agree to the collection and use of information in accordance with this policy.
              If you do not agree with our policies and practices, please do not use our Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3">2.1 Information You Provide</h3>
            <p className="text-muted-foreground mb-4">
              We collect information that you voluntarily provide when using our Platform:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, username, password</li>
              <li><strong>Profile Information:</strong> Bio, profile picture, location, timezone, website</li>
              <li><strong>Community Content:</strong> Posts, comments, messages, uploaded files</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we don't store card details)</li>
              <li><strong>Communications:</strong> When you contact us for support</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
              <li><strong>Device Information:</strong> Browser type, IP address, operating system</li>
              <li><strong>Cookies:</strong> Session cookies for authentication and preferences</li>
              <li><strong>Analytics:</strong> Aggregated usage statistics (no personal identification)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.3 Video Session Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>Video/Audio:</strong> Processed in real-time via LiveKit (not stored unless recording enabled)</li>
              <li><strong>Recordings:</strong> Stored only when explicitly enabled by session host</li>
              <li><strong>Transcriptions:</strong> Generated via OpenAI API (stored on our servers)</li>
              <li><strong>Session Metadata:</strong> Attendance, duration, participation stats</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Provide, maintain, and improve our Platform</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative messages, updates, and security alerts</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze usage trends and activities</li>
              <li>Detect, prevent, and address technical issues and fraudulent activity</li>
              <li>Personalize your experience on the Platform</li>
              <li>Send you marketing communications (with your consent)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. How We Share Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We do not sell your personal information. We may share your information in the following situations:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
              <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf:
                <ul className="list-circle pl-6 mt-2 space-y-1">
                  <li>LiveKit (video infrastructure)</li>
                  <li>Stripe (payment processing)</li>
                  <li>OpenAI (AI transcription)</li>
                  <li>Cloudflare R2 (file storage)</li>
                  <li>Resend (email delivery)</li>
                  <li>UploadThing (file uploads)</li>
                </ul>
              </li>
              <li><strong>Community Members:</strong> Information you post in communities is visible to other members</li>
              <li><strong>Legal Requirements:</strong> If required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We retain your information for as long as necessary to provide our services and comply with legal obligations:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>Account Data:</strong> Until you delete your account</li>
              <li><strong>Community Content:</strong> As long as the community exists</li>
              <li><strong>Video Recordings:</strong> Until deleted by the community owner</li>
              <li><strong>Payment Records:</strong> 7 years (legal requirement)</li>
              <li><strong>Analytics Data:</strong> Aggregated data retained indefinitely</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Your Privacy Rights</h2>
            <p className="text-muted-foreground mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Object:</strong> Object to processing of your personal data</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@unytea.com" className="text-primary hover:underline">
                privacy@unytea.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>End-to-end encryption for video sessions (via LiveKit)</li>
              <li>HTTPS/TLS encryption for data in transit</li>
              <li>Encrypted storage for sensitive data at rest</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Secure password hashing (bcrypt)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground mb-4">
              Our Platform is not intended for users under 13 years of age. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information from
              a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground mb-4">
              Your information may be transferred to and processed in countries other than your country of residence.
              These countries may have different data protection laws. We ensure appropriate safeguards are in place
              to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar tracking technologies:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Platform</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              You can control cookies through your browser settings. However, disabling cookies may affect
              functionality of the Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending you an email notification (for material changes)</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              Your continued use of the Platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions or concerns about this Privacy Policy, please contact us:
            </p>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-foreground mb-2"><strong>Unytea</strong></p>
              <p className="text-muted-foreground">Email: <a href="mailto:privacy@unytea.com" className="text-primary hover:underline">privacy@unytea.com</a></p>
              <p className="text-muted-foreground">Support: <a href="mailto:support@unytea.com" className="text-primary hover:underline">support@unytea.com</a></p>
              <p className="text-muted-foreground">Website: <a href="https://unytea.com" className="text-primary hover:underline">unytea.com</a></p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              This Privacy Policy is effective as of {lastUpdated} and will remain in effect except with respect
              to any changes in its provisions in the future, which will be in effect immediately after being
              posted on this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

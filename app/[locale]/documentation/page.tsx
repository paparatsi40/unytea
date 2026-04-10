import Link from "next/link";
import { BookOpen, LifeBuoy, MessageSquare, ShieldCheck } from "lucide-react";

export default function DocumentationPage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <p className="text-sm text-muted-foreground mb-2">Resources</p>
          <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Practical guides for launching and operating your community on Unytea.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <div className="rounded-xl border bg-card p-6">
            <BookOpen className="w-5 h-5 text-primary mb-3" />
            <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
            <p className="text-sm text-muted-foreground">Set up your community, branding, and first onboarding steps.</p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <ShieldCheck className="w-5 h-5 text-primary mb-3" />
            <h2 className="text-lg font-semibold mb-2">Billing & Plans</h2>
            <p className="text-sm text-muted-foreground">Understand plans, transaction fees, subscriptions, and payouts.</p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <MessageSquare className="w-5 h-5 text-primary mb-3" />
            <h2 className="text-lg font-semibold mb-2">Community Operations</h2>
            <p className="text-sm text-muted-foreground">Moderation, member workflows, sessions, and content best practices.</p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <LifeBuoy className="w-5 h-5 text-primary mb-3" />
            <h2 className="text-lg font-semibold mb-2">Support</h2>
            <p className="text-sm text-muted-foreground">Need help? Reach us at <a href="mailto:support@unytea.com" className="text-primary hover:underline">support@unytea.com</a>.</p>
          </div>
        </div>

        <div className="pt-10">
          <Link href={`/${locale}`} className="text-sm font-medium text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

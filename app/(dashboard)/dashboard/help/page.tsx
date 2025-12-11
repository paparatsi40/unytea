import { 
  BookOpen, 
  MessageCircle, 
  FileText, 
  Video, 
  Users, 
  Settings,
  HelpCircle,
  Mail,
  ExternalLink,
  Lightbulb,
  PlayCircle
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HelpPage() {
  const faqs = [
    {
      q: "How do I create a community?",
      a: "Go to Dashboard > Communities > Create Community. Fill in the basic information, customize your community settings, and publish it. You can start with our 14-day free trial."
    },
    {
      q: "What's included in each plan?",
      a: "Starter ($49/mo): 1 community, 500 members. Professional ($99/mo): 3 communities, 2,500 members each. Business ($249/mo): 10 communities, 5,000 members each. All plans include video calls, AI transcription, file hosting, and 0% transaction fees."
    },
    {
      q: "How do video calls work?",
      a: "Unytea has native video calls powered by LiveKit. Schedule a session, invite members, and they can join with one click. All calls are automatically recorded and transcribed with AI."
    },
    {
      q: "Can I charge my members?",
      a: "Yes! You can enable paid memberships for your community. Set your own pricing and we charge 0% commission (only Stripe's 2.9% + $0.30 payment processing fee)."
    },
    {
      q: "How does the Buddy System work?",
      a: "The Buddy System pairs members based on their skills and goals. As a community admin, you can enable auto-matching or manually create buddy pairs to encourage peer learning."
    },
    {
      q: "What file types can I upload?",
      a: "You can upload images (JPG, PNG, GIF), documents (PDF, DOCX), videos (MP4, MOV), and more. Maximum file size depends on your plan."
    },
    {
      q: "How do I cancel my subscription?",
      a: "Go to Settings > Subscription & Billing > Cancel Subscription. You'll retain access until the end of your billing period."
    },
    {
      q: "Is there a mobile app?",
      a: "Currently Unytea is web-based and works great on mobile browsers. Native mobile apps are coming soon!"
    },
  ];

  const guides = [
    {
      icon: Users,
      title: "Getting Started",
      description: "Learn the basics of creating and managing your community",
      links: [
        { label: "Create your first community", url: "/docs/create-community" },
        { label: "Invite members", url: "/docs/invite-members" },
        { label: "Customize your branding", url: "/docs/branding" },
      ]
    },
    {
      icon: Video,
      title: "Video Sessions",
      description: "Host engaging video calls with your community",
      links: [
        { label: "Schedule a session", url: "/docs/schedule-session" },
        { label: "Manage live calls", url: "/docs/live-calls" },
        { label: "View recordings", url: "/docs/recordings" },
      ]
    },
    {
      icon: FileText,
      title: "Content & Posts",
      description: "Create and organize community content",
      links: [
        { label: "Create posts", url: "/docs/create-posts" },
        { label: "Upload files", url: "/docs/file-uploads" },
        { label: "Organize with sections", url: "/docs/sections" },
      ]
    },
    {
      icon: Settings,
      title: "Settings & Admin",
      description: "Configure your community settings",
      links: [
        { label: "Community settings", url: "/docs/community-settings" },
        { label: "Member management", url: "/docs/member-management" },
        { label: "Payments setup", url: "/docs/payments" },
      ]
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
          <HelpCircle className="h-8 w-8 text-purple-600" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-foreground">
          Help & Support
        </h1>
        <p className="text-lg text-muted-foreground">
          Find answers, learn how to use Unytea, and get help when you need it
        </p>
      </div>

      {/* Search */}
      <Card className="mb-12">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input 
              placeholder="Search for help articles, guides, and FAQs..." 
              className="flex-1"
            />
            <Button>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mb-12 grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <BookOpen className="mb-2 h-8 w-8 text-purple-600" />
            <CardTitle>Documentation</CardTitle>
            <CardDescription>
              Comprehensive guides and tutorials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/docs">
                Browse Docs <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <PlayCircle className="mb-2 h-8 w-8 text-purple-600" />
            <CardTitle>Video Tutorials</CardTitle>
            <CardDescription>
              Watch step-by-step video guides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/tutorials">
                Watch Videos <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <Mail className="mb-2 h-8 w-8 text-purple-600" />
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>
              Get help from our team (24-48h response)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@unytea.com">
                Email Us <Mail className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Popular Guides */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold text-foreground">
          Popular Guides
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {guides.map((guide, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                    <guide.icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>{guide.title}</CardTitle>
                    <CardDescription>{guide.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {guide.links.map((link, j) => (
                    <li key={j}>
                      <Link 
                        href={link.url}
                        className="flex items-center text-sm text-purple-600 hover:underline"
                      >
                        <Lightbulb className="mr-2 h-4 w-4" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="mb-6 text-2xl font-bold text-foreground">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <Card className="mt-12 border-purple-200 bg-purple-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Still need help?</CardTitle>
          <CardDescription>
            Our support team is here for you
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <a href="mailto:support@unytea.com">
              <Mail className="mr-2 h-5 w-5" />
              Email Support
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard/communities">
              <MessageCircle className="mr-2 h-5 w-5" />
              Community Forum
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
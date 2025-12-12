import Link from "next/link";
import { ArrowRight, Video, Sparkles, Palette, Zap, Shield, Globe } from "lucide-react";
import { HomeNav } from "@/components/HomeNav";

export default async function Home({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'en';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Navigation */}
      <HomeNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 slide-up-fade">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium"> Now in Beta</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 slide-up-fade" style={{ animationDelay: "0.1s" }}>
            Where Communities
            <br />
            <span className="text-foreground font-bold">Unite</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto slide-up-fade" style={{ animationDelay: "0.2s" }}>
            Like sharing tea with friends, Unytea makes community building warm, human, and genuine.
            <strong className="text-foreground"> Everything Skool has, plus the soul it's missing.</strong>
          </p>

          {/* Community with Soul Section */}
          <div className="text-center mb-12 slide-up-fade" style={{ animationDelay: "0.25s" }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Community with Soul.
              <br />
              <span className="text-primary">Not Just Another Platform.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              We took what works and added the warmth that's missing.
            </p>
          </div>

          {/* Communities Showcase Grid */}
          <div className="relative slide-up-fade mb-12" style={{ animationDelay: "0.3s" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10" />
            <div className="glass-strong rounded-2xl p-6 shadow-smooth-xl">
              <h3 className="text-center text-lg font-semibold mb-6 text-muted-foreground">
                Join Thriving Communities
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockCommunities.map((community, index) => (
                  <div
                    key={index}
                    className="glass rounded-xl p-4 hover:scale-105 transition-transform cursor-pointer group"
                  >
                    <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow relative">
                      <img 
                        src={community.image}
                        alt={community.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1 truncate">{community.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{community.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      {community.members} members
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center slide-up-fade" style={{ animationDelay: "0.4s" }}>
            <Link
              href={`/${locale}/auth/signup`}
              className="btn-hover-lift px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-smooth-lg inline-flex items-center gap-2 group"
            >
              Start Building Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-hover glass-strong rounded-2xl p-6"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-3">{feature.description}</p>
                {feature.badge && (
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    {feature.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Choose Unytea Over Skool?</h2>
            <p className="text-xl text-muted-foreground">
              Same core features. Better soul. Fair pricing.
            </p>
          </div>

          <div className="glass-strong rounded-2xl p-8 space-y-4">
            {comparisons.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full flex-shrink-0">
                  NEW
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Honest Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free. Scale as you grow. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`glass-strong rounded-2xl p-8 ${
                  plan.featured
                    ? "ring-2 ring-primary shadow-smooth-xl scale-105"
                    : ""
                }`}
              >
                {plan.featured && (
                  <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/${locale}/auth/signup`}
                  className={`btn-hover-lift block text-center py-3 rounded-xl font-semibold ${
                    plan.featured
                      ? "bg-primary text-primary-foreground shadow-smooth"
                      : "glass border border-border"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 -z-10" />
            <h2 className="text-4xl font-bold mb-4">
              Ready to Unite Your Community?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join us and experience community building that feels like home. 
            </p>
            <Link
              href={`/${locale}/auth/signup`}
              className="btn-hover-lift inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-smooth-lg"
            >
              Start Building Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-white">U</span>
              </div>
              <span className="font-bold">Unytea</span>
            </div>
            <p className="text-sm text-muted-foreground">
              2024 Unytea. Where Communities Unite. 
            </p>
            <div className="flex gap-6">
              <Link href={`/${locale}/privacy`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href={`/${locale}/terms`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href={`/${locale}/contact`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Features data
const features = [
  {
    icon: Video,
    title: "Built-in Video Calls",
    description: "1-on-1 and group sessions with recording, transcription, and screen sharing.",
    badge: "Skool doesn't have this",
  },
  {
    icon: Palette,
    title: "Complete Customization",
    description: "Your brand, your colors, your domain. Make it truly yours.",
    badge: "Skool doesn't have this",
  },
  {
    icon: Sparkles,
    title: "Buddy System",
    description: "Smart member matching and accountability partnerships that drive real connections.",
    badge: "Nobody else has this",
  },
  {
    icon: Zap,
    title: "Content Sharing Panel",
    description: "Share screens, whiteboards, PDFs, and videos in real-time during sessions.",
    badge: "Nobody else has this",
  },
  {
    icon: Shield,
    title: "Real-time Everything",
    description: "0ms latency with WebSockets. Discord-level performance for your community.",
    badge: null,
  },
  {
    icon: Globe,
    title: "Modern & Beautiful",
    description: "2024 design, not 2015. Glassmorphism, smooth animations, delightful UX.",
    badge: null,
  },
];

// Comparison data
const comparisons = [
  {
    title: "Buddy System",
    description: "Smart member matching for accountability partnerships. Skool doesn't have this at all.",
  },
  {
    title: "Content Sharing Panel",
    description: "Share whiteboards, files, and videos during live sessions. Nobody else has this.",
  },
  {
    title: "Videocalls Integrated",
    description: "Schedule, host, and record sessions without leaving the platform. No more Zoom links.",
  },
  {
    title: "Your Brand, Your Way",
    description: "Custom domains, colors, fonts, and CSS. Skool communities all look the same.",
  },
  {
    title: "Usage-Based Pricing",
    description: "Only pay for what you use. Transparent dashboard shows real-time usage.",
  },
  {
    title: "Real-time WebSockets",
    description: "Discord-level performance. 0ms latency. 90% less server load.",
  },
];

// Pricing data - Updated to match Stripe configuration
const pricingPlans = [
  {
    name: "Professional",
    price: 129,
    featured: true,
    features: [
      "1 community",
      "500 members included",
      "20 video hours/month",
      "AI transcription & summaries",
      "Recording & file hosting",
      "Buddy System",
      "Advanced analytics",
      "Overage: $0.15/member, $0.30/hour",
    ],
  },
  {
    name: "Scale",
    price: 249,
    featured: false,
    features: [
      "3 communities",
      "2,000 members each",
      "60 video hours/month",
      "Everything in Professional",
      "White-label branding",
      "Priority support",
      "Custom integrations",
      "Overage: $0.10/member, $0.20/hour",
    ],
  },
  {
    name: "Enterprise",
    price: 499,
    featured: false,
    features: [
      "10 communities",
      "5,000 members each",
      "150 video hours/month",
      "Everything in Scale",
      "Dedicated account manager",
      "SLA guarantee (99.9%)",
      "API access",
      "Overage: $0.08/member, $0.15/hour",
    ],
  },
];

// Mock communities data with real images
const mockCommunities = [
  {
    name: "Fitness Tribe",
    members: "2.3k",
    description: "Transform your body and mind with supportive fitness enthusiasts",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop&q=80",
  },
  {
    name: "Tech Founders",
    members: "1.8k",
    description: "Build the next unicorn with fellow startup founders and CTOs",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop&q=80",
  },
  {
    name: "Design Masters",
    members: "3.1k",
    description: "Elevate your craft with world-class designers and creative minds",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=400&fit=crop&q=80",
  },
  {
    name: "Content Creators",
    members: "4.2k",
    description: "Grow your audience and master the art of digital storytelling",
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=400&fit=crop&q=80",
  },
  {
    name: "Mindful Living",
    members: "1.5k",
    description: "Find inner peace through meditation, yoga, and mindfulness",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop&q=80",
  },
  {
    name: "Book Club",
    members: "890",
    description: "Discuss great books and expand your knowledge with fellow readers",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=400&fit=crop&q=80",
  },
  {
    name: "Music Lovers",
    members: "2.7k",
    description: "Share your passion for music and discover new sounds together",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop&q=80",
  },
  {
    name: "Entrepreneurs",
    members: "5.1k",
    description: "Scale your business with proven strategies from successful founders",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=400&fit=crop&q=80",
  },
];

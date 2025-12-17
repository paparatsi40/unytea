"use client";

import { useState } from "react";
import { Zap, CheckCircle2, Plus, Settings as SettingsIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: "connected" | "disconnected";
  features: string[];
  website?: string;
};

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept payments and manage subscriptions",
    icon: "💳",
    color: "from-purple-600 to-blue-600",
    status: "connected",
    features: ["Payment processing", "Subscription management", "Payout automation"],
    website: "https://stripe.com",
  },
];

const COMING_SOON_INTEGRATIONS: Integration[] = [
  {
    id: "google",
    name: "Google",
    description: "Connect your Google account for calendar sync",
    icon: "🔍",
    color: "from-blue-500 to-blue-600",
    status: "disconnected",
    features: ["Google Calendar sync", "Gmail notifications", "Google Drive integration"],
    website: "https://google.com",
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Host video calls and webinars",
    icon: "📹",
    color: "from-blue-400 to-indigo-500",
    status: "disconnected",
    features: ["Schedule Zoom meetings", "Auto-generate meeting links", "Recording management"],
    website: "https://zoom.us",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications and updates in your Slack workspace",
    icon: "💬",
    color: "from-purple-500 to-pink-500",
    status: "disconnected",
    features: ["Activity notifications", "Community updates", "Buddy check-ins"],
    website: "https://slack.com",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5,000+ apps",
    icon: "⚡",
    color: "from-orange-500 to-red-500",
    status: "disconnected",
    features: ["Workflow automation", "Custom triggers", "Multi-app integration"],
    website: "https://zapier.com",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Sync your members with email marketing campaigns",
    icon: "📧",
    color: "from-yellow-500 to-orange-500",
    status: "disconnected",
    features: ["Member sync", "Email campaigns", "Audience segmentation"],
    website: "https://mailchimp.com",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Connect your Notion workspace for content collaboration",
    icon: "📝",
    color: "from-gray-700 to-gray-900",
    status: "disconnected",
    features: ["Content sync", "Collaborative docs", "Knowledge base"],
    website: "https://notion.so",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Sync your community with Discord servers",
    icon: "🎮",
    color: "from-indigo-500 to-purple-600",
    status: "disconnected",
    features: ["Server sync", "Role management", "Activity notifications"],
    website: "https://discord.com",
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(AVAILABLE_INTEGRATIONS);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleConnect = async (id: string) => {
    setIsConnecting(id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === id
          ? { ...integration, status: integration.status === "connected" ? "disconnected" : "connected" }
          : integration
      )
    );
    
    setIsConnecting(null);
  };

  const connectedCount = integrations.filter(i => i.status === "connected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Integrations</h2>
        <p className="text-base text-muted-foreground">
          Connect third-party services to enhance your experience
        </p>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{connectedCount}/{integrations.length}</p>
            <p className="text-base text-muted-foreground">Active integrations</p>
          </div>
        </div>
      </div>

      {/* Active Integrations */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4">Active Integrations</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="group rounded-xl border border-border/50 bg-card/50 p-6 transition-all hover:shadow-lg"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${integration.color} text-2xl`}>
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {integration.name}
                      {integration.status === "connected" && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {integration.status === "connected" ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                
                {integration.website && (
                  <a
                    href={integration.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
              </div>

              {/* Description */}
              <p className="text-base text-muted-foreground mb-4">
                {integration.description}
              </p>

              {/* Features */}
              <div className="space-y-2 mb-4">
                {integration.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting === integration.id}
                  variant={integration.status === "connected" ? "outline" : "default"}
                  size="sm"
                  className="flex-1 text-base"
                >
                  {isConnecting === integration.id ? (
                    "Connecting..."
                  ) : integration.status === "connected" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
                
                {integration.status === "connected" && (
                  <Button variant="ghost" size="sm">
                    <SettingsIcon className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4">Coming Soon</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {COMING_SOON_INTEGRATIONS.map((integration) => (
            <div
              key={integration.id}
              className="group rounded-xl border border-border/50 bg-card/50 p-6 opacity-60"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${integration.color} text-2xl`}>
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {integration.name}
                      <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">Soon</span>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Coming soon
                    </p>
                  </div>
                </div>
                
                {integration.website && (
                  <a
                    href={integration.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
              </div>

              {/* Description */}
              <p className="text-base text-muted-foreground mb-4">
                {integration.description}
              </p>

              {/* Features */}
              <div className="space-y-2 mb-4">
                {integration.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Disabled button */}
              <Button
                disabled
                variant="outline"
                size="sm"
                className="flex-1 w-full text-base"
              >
                Coming Soon
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Request New Integration */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Need a specific integration?</h3>
        <p className="text-base text-muted-foreground mb-4">
          Let us know which integration you'd like to see next
        </p>
        <Button variant="outline" size="sm" className="text-base" asChild>
          <a href="mailto:support@unytea.com?subject=Integration Request">
            Request Integration
          </a>
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
        <p className="text-base text-foreground">
          <strong>💡 Note:</strong> We're actively building new integrations. Enterprise customers can request custom integrations.
        </p>
      </div>
    </div>
  );
}

import { Zap, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Integrations | Settings | Unytea",
};

const integrations = [
  {
    name: "Stripe",
    description: "Accept payments for courses and memberships",
    icon: "💳",
    status: "available" as const,
    href: "/dashboard/settings/billing",
  },
  {
    name: "Zoom",
    description: "Host video sessions with Zoom integration",
    icon: "📹",
    status: "coming_soon" as const,
  },
  {
    name: "Google Calendar",
    description: "Sync your sessions with Google Calendar",
    icon: "📅",
    status: "coming_soon" as const,
  },
  {
    name: "Zapier",
    description: "Connect Unytea with 5,000+ apps",
    icon: "⚡",
    status: "coming_soon" as const,
  },
  {
    name: "Slack",
    description: "Get community notifications in Slack",
    icon: "💬",
    status: "coming_soon" as const,
  },
  {
    name: "Discord",
    description: "Bridge your community with Discord",
    icon: "🎮",
    status: "coming_soon" as const,
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect third-party services to enhance your community
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <span className="text-2xl">{integration.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {integration.name}
                </h3>
                {integration.status === "coming_soon" && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {integration.description}
              </p>
              {integration.status === "available" && integration.href && (
                <a
                  href={integration.href}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                >
                  Configure
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="text-sm font-semibold text-purple-900">
              Request an Integration
            </h3>
            <p className="mt-1 text-xs text-purple-700">
              Need a specific integration? Let us know at{" "}
              <a
                href="mailto:support@unytea.com"
                className="font-medium underline"
              >
                support@unytea.com
              </a>{" "}
              and we&apos;ll consider adding it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

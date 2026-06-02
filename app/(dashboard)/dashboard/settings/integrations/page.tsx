import { IntegrationsView } from "@/components/settings/IntegrationsView";

export const metadata = {
  title: "Integrations | Settings | Unytea",
};

// Server-thin: keeps the metadata export; the rendered UI lives in the
// client view so it can localize (the (dashboard) tree has no [locale]
// segment, so server-side getTranslations would always resolve to "en").
export default function IntegrationsPage() {
  return <IntegrationsView />;
}

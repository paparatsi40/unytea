"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SectionBuilder } from "@/components/section-builder/SectionBuilder";
import { SectionInstance } from "@/components/section-builder/types";
import { resetCommunityLandingToDefault } from "@/app/actions/community-landing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Eye, ArrowLeft, Sparkles } from "lucide-react";

export default function LandingPageSettings() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) ?? "";
  const t = useTranslations("community.landing.settings");

  const [loading, setLoading] = useState(true);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState<string | null>(null);
  const [initialSections, setInitialSections] = useState<SectionInstance[]>([]);
  const [isResetting, startReset] = useTransition();

  useEffect(() => {
    fetchCommunityData();
  }, [slug]);

  async function fetchCommunityData() {
    try {
      const response = await fetch(`/api/communities/${slug}`);
      if (!response.ok) throw new Error("Failed to fetch community");

      const data = await response.json();

      setCommunityId(data.id ?? null);
      setCommunityName(data.name || "");
      setCommunityDescription(data.description || null);

      // Load existing landing layout or use empty array
      if (data.landingLayout && Array.isArray(data.landingLayout)) {
        setInitialSections(data.landingLayout);
      } else {
        setInitialSections([]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("loadFailedToast"));
    }
    setLoading(false);
  }

  async function handleSave(sections: SectionInstance[]) {
    try {
      const response = await fetch(`/api/communities/${slug}/landing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingLayout: sections,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(t("saveSuccessToast"));
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("saveFailedToast"));
      throw error; // Re-throw to let SectionBuilder handle it
    }
  }

  function handleResetToDefault() {
    if (!communityId) return;
    const hasLayout = initialSections.length > 0;
    if (hasLayout && !confirm(t("confirmReset"))) {
      return;
    }
    startReset(async () => {
      try {
        await resetCommunityLandingToDefault(communityId);
        toast.success(t("successToast"));
        await fetchCommunityData(); // reload so the builder shows the new layout
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("errorToast"));
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasLayout = initialSections.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/c/${slug}/settings`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("builderTitle")}</h1>
              <p className="mt-2 text-muted-foreground">{t("builderSubtitle")}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant={hasLayout ? "outline" : "default"}
            className="gap-2"
            onClick={handleResetToDefault}
            disabled={isResetting || !communityId}
          >
            <Sparkles className="h-4 w-4" />
            {isResetting
              ? t("applying")
              : hasLayout
                ? t("resetToDefault")
                : t("useDefaultTemplate")}
          </Button>
          <Button variant="outline" onClick={() => window.open(`/c/${slug}`, "_blank")}>
            <Eye className="mr-2 h-4 w-4" />
            {t("preview")}
          </Button>
        </div>
      </div>

      {/* Section Builder */}
      <SectionBuilder
        initialSections={initialSections}
        onSave={handleSave}
        communityName={communityName}
        communityDescription={communityDescription}
      />

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">{t("help.title")}</h3>
            <ul className="mt-2 space-y-1 text-xs text-blue-700">
              <li>• {t.rich("help.addSections", { b: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>• {t.rich("help.reorder", { b: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>• {t.rich("help.editContent", { b: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>
                • {t.rich("help.previewRealtime", { b: (chunks) => <strong>{chunks}</strong> })}
              </li>
              <li>• {t.rich("help.saveChanges", { b: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>• {t.rich("help.responsive", { b: (chunks) => <strong>{chunks}</strong> })}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

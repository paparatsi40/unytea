"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SectionBuilder } from "@/components/section-builder/SectionBuilder";
import { SectionInstance } from "@/components/section-builder/types";
import { toast } from "sonner";
import { Loader2, Eye, ArrowLeft } from "lucide-react";

export default function LandingPageSettings() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [initialSections, setInitialSections] = useState<SectionInstance[]>([]);

  useEffect(() => {
    fetchCommunityData();
  }, [slug]);

  async function fetchCommunityData() {
    try {
      const response = await fetch(`/api/communities/${slug}`);
      if (!response.ok) throw new Error("Failed to fetch community");
      
      const data = await response.json();
      
      // Load existing landing layout or use empty array
      if (data.landingLayout && Array.isArray(data.landingLayout)) {
        setInitialSections(data.landingLayout);
      } else {
        setInitialSections([]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load landing page settings");
    } finally {
      setLoading(false);
    }
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

      toast.success("Landing page saved successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to save landing page");
      throw error; // Re-throw to let SectionBuilder handle it
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-foreground">Landing Page Builder</h1>
              <p className="mt-2 text-muted-foreground">
                Build your landing page with pre-designed sections
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(`/c/${slug}`, "_blank")}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      {/* Section Builder */}
      <SectionBuilder
        initialSections={initialSections}
        onSave={handleSave}
      />

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">
              How to use the Section Builder
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-blue-700">
              <li>• <strong>Add sections</strong> from the left panel by clicking on them</li>
              <li>• <strong>Reorder sections</strong> using the ↑/↓ buttons in the layers panel</li>
              <li>• <strong>Edit content</strong> by selecting a section and using the properties panel on the right</li>
              <li>• <strong>Preview in real-time</strong> in the center panel</li>
              <li>• <strong>Save your changes</strong> using the Save button</li>
              <li>• <strong>All sections are responsive</strong> and work perfectly on mobile devices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

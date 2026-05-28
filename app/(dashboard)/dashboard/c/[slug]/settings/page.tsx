"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CommunityCategory } from "@prisma/client";
import { deleteCommunity } from "@/app/actions/communities";

type FormCategory = CommunityCategory | "";

// Object.keys(enum) is safe here (returns own enumerable keys only), but use
// a Set for the membership check below so the pattern matches the other
// validators in this PR. `rawCategory in CommunityCategory` would walk the
// prototype chain and accept "hasOwnProperty" etc., which then survives the
// `as CommunityCategory` cast and surfaces in the UI.
const KNOWN_CATEGORIES = Object.values(CommunityCategory) as CommunityCategory[];
const KNOWN_CATEGORY_SET = new Set<CommunityCategory>(KNOWN_CATEGORIES);

export default function GeneralSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const tCat = useTranslations("explore.categories");
  const tDiscovery = useTranslations("explore.settings");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    isPrivate: boolean;
    requireApproval: boolean;
    category: FormCategory;
    language: string;
    excludeFromExplore: boolean;
  }>({
    name: "",
    description: "",
    isPrivate: false,
    requireApproval: false,
    category: "",
    language: "",
    excludeFromExplore: false,
  });

  useEffect(() => {
    // Load community data
    async function loadCommunity() {
      try {
        const response = await fetch(`/api/communities/${slug}`);
        if (response.ok) {
          const data = await response.json();
          // The GET endpoint returns the full record under `community`, plus
          // a few flat fields (id, name, slug) at the top for backward compat.
          // Pull everything from `community` so toggles/description hydrate too.
          const community = data?.community ?? {};
          // category/language/excludeFromExplore now live in top-level typed
          // columns (Commit 1 of feat/restore-explore). Pre-existing values
          // stored as free strings in settings JSON are NOT auto-migrated —
          // host must re-save to populate the typed columns. Dead JSON is
          // harmless because read paths use the typed columns only.
          const rawCategory = community.category;
          const category: FormCategory =
            typeof rawCategory === "string" &&
            KNOWN_CATEGORY_SET.has(rawCategory as CommunityCategory)
              ? (rawCategory as CommunityCategory)
              : "";
          setFormData({
            name: community.name ?? data.name ?? "",
            description: community.description ?? "",
            isPrivate: Boolean(community.isPrivate),
            requireApproval: Boolean(community.requireApproval),
            category,
            language: typeof community.language === "string" ? community.language : "",
            excludeFromExplore: Boolean(community.excludeFromExplore),
          });
        }
      } catch (error) {
        console.error("Error loading community:", error);
        toast.error("Failed to load community data");
      } finally {
        setLoading(false);
      }
    }

    loadCommunity();
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/communities/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Settings saved successfully!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!formData.name) {
      toast.error("Community name is required for deletion confirmation");
      return;
    }

    const confirmText = window.prompt(
      `Type the community name exactly to confirm deletion:\n\n${formData.name}`
    );

    if (confirmText === null) return;

    if (confirmText.trim() !== formData.name.trim()) {
      toast.error("Confirmation text does not match community name");
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/communities/${slug}`);
      if (!response.ok) {
        throw new Error("Could not load community before deletion");
      }

      const data = await response.json();
      const communityId = data?.id || data?.community?.id;

      if (!communityId) {
        throw new Error("Community id not found");
      }

      const result = await deleteCommunity(communityId);

      if (result.success) {
        toast.success("Community deleted successfully");
        router.push("/dashboard/communities");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete community");
      }
    } catch (error) {
      console.error("Error deleting community:", error);
      toast.error("Failed to delete community");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
        <p className="mt-1 text-sm text-gray-500">Update your community's basic information</p>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        {/* Community Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Community Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="My Awesome Community"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tell people what your community is about..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Shown on the public Explore page and on your community card.
          </p>
        </div>

        {/* Category + Language */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as FormCategory,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a category…</option>
              {KNOWN_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {tCat(value)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Helps people find your community in Explore.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Primary language</label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a language…</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="pt">Português</option>
              <option value="de">Deutsch</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The language most conversations and sessions happen in.
            </p>
          </div>
        </div>

        {/* Discovery */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-1 text-sm font-medium text-gray-900">
            {tDiscovery("discoveryHeader")}
          </h3>
          <p className="mb-4 text-xs text-gray-500">{tDiscovery("discoveryDescription")}</p>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={!formData.excludeFromExplore}
              onChange={(e) =>
                setFormData({ ...formData, excludeFromExplore: !e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">{tDiscovery("listToggle")}</div>
              <div className="text-xs text-gray-500">{tDiscovery("listToggleDescription")}</div>
            </div>
          </label>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input
              type="checkbox"
              id="isPrivate"
              checked={formData.isPrivate}
              onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex-1">
              <label htmlFor="isPrivate" className="block text-sm font-medium text-gray-900">
                Private Community
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Only approved members can see the community content
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input
              type="checkbox"
              id="requireApproval"
              checked={formData.requireApproval}
              onChange={(e) => setFormData({ ...formData, requireApproval: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex-1">
              <label htmlFor="requireApproval" className="block text-sm font-medium text-gray-900">
                Require Approval for New Members
              </label>
              <p className="mt-1 text-xs text-gray-500">
                You'll need to approve each member before they can join
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/c/${slug}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="mb-2 text-lg font-semibold text-red-900">Danger Zone</h3>
        <p className="mb-4 text-sm text-red-700">
          Once you delete a community, there is no going back. Please be certain.
        </p>
        <Button
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100"
          onClick={handleDeleteCommunity}
          disabled={deleting}
        >
          {deleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Community
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

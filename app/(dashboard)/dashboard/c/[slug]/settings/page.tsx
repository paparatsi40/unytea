"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { deleteCommunity } from "@/app/actions/communities";

export default function GeneralSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
    requireApproval: false,
    category: "",
    language: "",
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
          const settings =
            community.settings && typeof community.settings === "object"
              ? (community.settings as Record<string, unknown>)
              : {};
          const category =
            typeof settings.category === "string" ? settings.category : "";
          const language =
            typeof settings.language === "string" ? settings.language : "";
          setFormData({
            name: community.name ?? data.name ?? "",
            description: community.description ?? "",
            isPrivate: Boolean(community.isPrivate),
            requireApproval: Boolean(community.requireApproval),
            category,
            language,
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
        <p className="text-sm text-gray-500 mt-1">
          Update your community's basic information
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
        {/* Community Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Community Name
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a category…</option>
              <option value="AI">AI</option>
              <option value="Startups">Startups</option>
              <option value="Marketing">Marketing</option>
              <option value="Business">Business</option>
              <option value="Tech">Tech</option>
              <option value="Programming">Programming</option>
              <option value="Fitness">Fitness</option>
              <option value="Health">Health</option>
              <option value="Wellness">Wellness</option>
              <option value="Personal Development">Personal Development</option>
              <option value="Education">Education</option>
              <option value="Creativity">Creativity</option>
              <option value="Finance">Finance</option>
              <option value="Other">Other</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Helps people find your community in Explore.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary language
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Any</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Portuguese">Portuguese</option>
              <option value="German">German</option>
              <option value="Italian">Italian</option>
              <option value="Other">Other</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The language most conversations and sessions happen in.
            </p>
          </div>
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
              <p className="text-xs text-gray-500 mt-1">
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
              <p className="text-xs text-gray-500 mt-1">
                You'll need to approve each member before they can join
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/c/${slug}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
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
        <h3 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Community
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

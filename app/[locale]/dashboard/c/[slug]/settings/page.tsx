"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";

export default function GeneralSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
    requireApproval: false,
  });

  useEffect(() => {
    // Load community data
    async function loadCommunity() {
      try {
        const response = await fetch(`/api/communities/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: data.name,
            description: data.description || "",
            isPrivate: data.isPrivate,
            requireApproval: data.requireApproval,
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
        <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Community
        </Button>
      </div>
    </div>
  );
}

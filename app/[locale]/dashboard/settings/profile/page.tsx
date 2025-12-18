"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2, CheckCircle2, MapPin, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { CurrentPlanBadge } from "@/components/subscription/CurrentPlanBadge";
import Link from "next/link";

export default function ProfilePage() {
  const { user, mutate } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    tagline: "",
    website: "",
    location: "",
    timezone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        bio: user.bio || "",
        tagline: user.tagline || "",
        website: user.website || "",
        location: user.location || "",
        timezone: user.timezone || "UTC",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Profile updated successfully" });
        mutate(); // Refresh user data
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Profile</h2>
        <p className="text-base text-muted-foreground">
          Manage your personal information
        </p>
        <div className="mt-3 flex items-center gap-2">
          <CurrentPlanBadge />
          {user && user.subscriptionPlan !== "FREE" && (
            <Link 
              href="/dashboard/settings/billing" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Manage subscription →
            </Link>
          )}
        </div>
      </div>

      {/* Avatar Section */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Profile Picture</h3>
        <AvatarUpload 
          currentImage={user.image}
          userName={user.name}
          userEmail={user.email || undefined}
        />
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your full name"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Email
            </label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-base text-muted-foreground cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Tagline
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="A short one-liner about yourself"
              maxLength={100}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-sm text-muted-foreground">
              {formData.tagline.length}/100 characters
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-sm text-muted-foreground">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Additional Information</h3>

          {/* Website */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              <Globe className="h-4 w-4 inline mr-2" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://yourwebsite.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              <MapPin className="h-4 w-4 inline mr-2" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="City, Country"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              <Clock className="h-4 w-4 inline mr-2" />
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="UTC">UTC (GMT+0)</option>
              <option value="America/New_York">Eastern Time (GMT-5)</option>
              <option value="America/Chicago">Central Time (GMT-6)</option>
              <option value="America/Denver">Mountain Time (GMT-7)</option>
              <option value="America/Los_Angeles">Pacific Time (GMT-8)</option>
              <option value="Europe/London">London (GMT+0)</option>
              <option value="Europe/Paris">Paris (GMT+1)</option>
              <option value="Europe/Berlin">Berlin (GMT+1)</option>
              <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
              <option value="Asia/Shanghai">Shanghai (GMT+8)</option>
              <option value="Australia/Sydney">Sydney (GMT+10)</option>
            </select>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg border p-4 text-base ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-600"
                : "border-red-200 bg-red-50 text-red-600"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" && <CheckCircle2 className="h-5 w-5" />}
              {message.text}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                name: user.name || "",
                bio: user.bio || "",
                tagline: user.tagline || "",
                website: user.website || "",
                location: user.location || "",
                timezone: user.timezone || "UTC",
              });
              setMessage(null);
            }}
            className="text-base px-6 py-2"
          >
            Reset
          </Button>
          <Button type="submit" disabled={isLoading} className="text-base px-6 py-2">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

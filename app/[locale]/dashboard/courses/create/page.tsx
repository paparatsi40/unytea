"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/app/actions/courses";
import { BookOpen, Loader2, ArrowLeft, Sparkles, Award, Video, FileText, Tag, DollarSign, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

type Community = {
  id: string;
  name: string;
};

export default function CreateCoursePage() {
  const router = useRouter();
  const locale = useLocale();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    communityId: "",
    isPaid: false,
    price: 0,
    tier: "standard" as "intro" | "standard" | "advanced" | "premium",
    isLeadMagnet: false,
    whatYouWillLearn: "",
    salesPageContent: "",
    previewVideoUrl: "",
    certificateEnabled: false,
    liveSupportEnabled: false,
    upgradeCourseId: "",
  });

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const response = await fetch("/api/communities/my-communities");
      if (response.ok) {
        const data = await response.json();
        setCommunities(data.communities || []);
        if (data.communities && data.communities.length > 0) {
          setFormData(prev => ({ ...prev, communityId: data.communities[0].id }));
        }
      }
    } catch (error) {
      console.error("Error loading communities:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await createCourse({
        ...formData,
        price: formData.isPaid ? formData.price : 0,
      });

      if (result.success && result.course) {
        router.push(`/${locale}/dashboard/courses/${result.course.id}`);
      } else {
        setError(result.error || "Failed to create course");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    setFormData(prev => ({ ...prev, title, slug }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Compact Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/dashboard/courses`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create Course</h1>
              <p className="text-xs text-muted-foreground">Fill in the details below</p>
            </div>
          </div>
          
          {/* Pro Tip - Inline */}
          <div className="hidden lg:flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-foreground"><strong>Tip:</strong> Start with a free intro course</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 2-Column Grid Layout */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Basic Information</h2>
                </div>

                <div className="space-y-3">
                  {/* Community */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Community <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.communityId}
                      onChange={(e) => setFormData(prev => ({ ...prev, communityId: e.target.value }))}
                      required
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select a community</option>
                      {communities.map((community) => (
                        <option key={community.id} value={community.id}>
                          {community.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Course Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      required
                      placeholder="Complete Web Development Bootcamp"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      URL Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      required
                      placeholder="web-development-bootcamp"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Short Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                      placeholder="A brief overview of what this course is about..."
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Tier & Strategy */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Tag className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Type & Strategy</h2>
                </div>

                <div className="space-y-3">
                  {/* Tier */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Course Tier <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData(prev => ({ ...prev, tier: e.target.value as any }))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="intro">🌱 Intro - Lead magnet</option>
                      <option value="standard">📚 Standard - Core content</option>
                      <option value="advanced">🚀 Advanced - Experienced</option>
                      <option value="premium">💎 Premium - Elite</option>
                    </select>
                  </div>

                  {/* Lead Magnet Checkbox */}
                  <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
                    <input
                      type="checkbox"
                      id="isLeadMagnet"
                      checked={formData.isLeadMagnet}
                      onChange={(e) => setFormData(prev => ({ ...prev, isLeadMagnet: e.target.checked, isPaid: e.target.checked ? false : prev.isPaid }))}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <label htmlFor="isLeadMagnet" className="text-xs font-medium text-foreground cursor-pointer block">
                        🎁 Lead Magnet (Always Free)
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Designed to attract and convert to paid courses
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Pricing</h2>
                </div>

                <div className="space-y-3">
                  {/* Paid Checkbox */}
                  <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
                    <input
                      type="checkbox"
                      id="isPaid"
                      checked={formData.isPaid}
                      disabled={formData.isLeadMagnet}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPaid: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <label htmlFor="isPaid" className="text-xs font-medium text-foreground cursor-pointer block">
                        💰 Paid Course
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Requires purchase before access
                      </p>
                    </div>
                  </div>

                  {/* Price Input */}
                  {formData.isPaid && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">
                        Price (USD) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                          required={formData.isPaid}
                          min="1"
                          step="0.01"
                          placeholder="49.99"
                          className="w-full rounded-md border border-border bg-background pl-7 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 $19-49 (standard), $49-149 (advanced), $199+ (premium)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Features */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Award className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Features</h2>
                </div>

                <div className="space-y-3">
                  {/* Certificate */}
                  <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
                    <input
                      type="checkbox"
                      id="certificateEnabled"
                      checked={formData.certificateEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, certificateEnabled: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <label htmlFor="certificateEnabled" className="text-xs font-medium text-foreground cursor-pointer block">
                        🏆 Certificate of Completion
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Award upon course completion
                      </p>
                    </div>
                  </div>

                  {/* Live Support */}
                  <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
                    <input
                      type="checkbox"
                      id="liveSupportEnabled"
                      checked={formData.liveSupportEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, liveSupportEnabled: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <label htmlFor="liveSupportEnabled" className="text-xs font-medium text-foreground cursor-pointer block">
                        💬 Live Q&A Support
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Access to live sessions and direct support
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Marketing & Sales */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Video className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Marketing & Sales</h2>
                </div>

                <div className="space-y-3">
                  {/* Preview Video */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Preview Video URL
                    </label>
                    <input
                      type="url"
                      value={formData.previewVideoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, previewVideoUrl: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      YouTube, Vimeo, or video URL
                    </p>
                  </div>

                  {/* What You'll Learn */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      What You'll Learn (one per line)
                    </label>
                    <textarea
                      value={formData.whatYouWillLearn}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatYouWillLearn: e.target.value }))}
                      placeholder="Build full-stack web apps&#10;Master React and Next.js&#10;Deploy to production&#10;Work with databases"
                      rows={6}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Displayed as bullet points on course page
                    </p>
                  </div>

                  {/* Sales Page Content */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Sales Page Content (Markdown)
                    </label>
                    <textarea
                      value={formData.salesPageContent}
                      onChange={(e) => setFormData(prev => ({ ...prev, salesPageContent: e.target.value }))}
                      placeholder="## Why Take This Course?&#10;&#10;Transform your skills...&#10;&#10;## Who Is This For?&#10;&#10;Perfect for..."
                      rows={12}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports Markdown formatting
                    </p>
                  </div>

                  {/* Upgrade Course ID */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Upgrade Course ID (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.upgradeCourseId}
                      onChange={(e) => setFormData(prev => ({ ...prev, upgradeCourseId: e.target.value }))}
                      placeholder="Course ID to upsell to"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      For upselling after course completion
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur p-4 rounded-lg border border-border shadow-lg">
            <Link href={`/${locale}/dashboard/courses`}>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading || communities.length === 0} className="min-w-[140px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Course
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

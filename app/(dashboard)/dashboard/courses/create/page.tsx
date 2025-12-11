"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/app/actions/courses";
import { BookOpen, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Community = {
  id: string;
  name: string;
};

export default function CreateCoursePage() {
  const router = useRouter();
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
        router.push(`/dashboard/courses/${result.course.id}`);
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
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
              <BookOpen className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Course</h1>
              <p className="text-muted-foreground">Create a new course for your community</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border/50 bg-card/50 p-6">
          {/* Community Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Community <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.communityId}
              onChange={(e) => setFormData(prev => ({ ...prev, communityId: e.target.value }))}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a community</option>
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
            {communities.length === 0 && (
              <p className="text-xs text-muted-foreground">
                You need to create a community first.{" "}
                <Link href="/dashboard/communities/create" className="text-primary hover:underline">
                  Create one now
                </Link>
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Course Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              placeholder="e.g., Complete Web Development Bootcamp"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              required
              placeholder="web-development-bootcamp"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly version of the title (auto-generated)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What will students learn in this course?"
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Pricing */}
          <div className="space-y-4 rounded-lg border border-border/30 bg-background p-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPaid"
                checked={formData.isPaid}
                onChange={(e) => setFormData(prev => ({ ...prev, isPaid: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isPaid" className="text-sm font-medium text-foreground">
                This is a paid course
              </label>
            </div>

            {formData.isPaid && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Price (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                  required={formData.isPaid}
                  min="0"
                  step="0.01"
                  placeholder="49.99"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Link href="/dashboard/courses">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading || communities.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            <strong>💡 Next Steps:</strong> After creating the course, you can add modules and lessons from the course detail page.
          </p>
        </div>
      </div>
    </div>
  );
}

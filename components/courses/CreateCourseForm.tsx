"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BookOpen, DollarSign, Image as ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";

interface CreateCourseFormProps {
  communityId: string;
  slug: string;
  locale: string;
}

export function CreateCourseForm({ communityId, slug, locale }: CreateCourseFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"url" | "upload">("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    imageUrl: "",
    isPaid: false,
    price: "",
    currency: "USD",
  });

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    }));
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clear image
  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload image to Cloudinary or similar service
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const result = await response.json();
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validate
      if (!formData.title.trim()) {
        throw new Error("Title is required");
      }
      if (!formData.slug.trim()) {
        throw new Error("Slug is required");
      }
      if (formData.isPaid && (!formData.price || parseFloat(formData.price) <= 0)) {
        throw new Error("Price must be greater than 0 for paid courses");
      }

      let finalImageUrl = formData.imageUrl;

      // Upload image if a file was selected
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: finalImageUrl,
          communityId,
          price: formData.isPaid ? parseFloat(formData.price) : 0,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create course");
      }

      // Redirect to the courses list in the community
      router.push(`/${locale}/dashboard/communities/${slug}/courses`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };

  const displayPreview = imagePreview || formData.imageUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-500 text-base">
          {error}
        </div>
      )}

      {/* Basic Info Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Basic Information
          </h3>
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">Course Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Complete Web Development Masterclass"
                required
                className="h-14 text-base"
              />
              <p className="text-sm text-muted-foreground">
                A clear, compelling title that describes what students will learn
              </p>
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-base font-medium">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-base text-muted-foreground px-4 py-3 bg-accent rounded-lg">
                  /courses/
                </span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="web-development-masterclass"
                  required
                  className="h-14 text-base"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Auto-generated from title, but you can customize it
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What will students learn in this course? What makes it unique?"
                rows={5}
                className="resize-none text-base"
              />
              <p className="text-sm text-muted-foreground">
                A detailed description to help students understand the course value
              </p>
            </div>
          </div>
        </div>

        {/* Visual Section */}
        <div className="space-y-4 pt-6 border-t border-border">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
            <ImageIcon className="h-6 w-6 text-primary" />
            Course Image
          </h3>

          {/* Upload Method Toggle */}
          <div className="flex items-center gap-2 p-1 bg-accent rounded-lg w-fit">
            <button
              type="button"
              onClick={() => {
                setUploadMethod("upload");
                setFormData((prev) => ({ ...prev, imageUrl: "" }));
              }}
              className={`px-5 py-3 rounded-md text-base font-medium transition-all ${
                uploadMethod === "upload"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-5 w-5 inline mr-2" />
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMethod("url");
                clearImage();
              }}
              className={`px-5 py-3 rounded-md text-base font-medium transition-all ${
                uploadMethod === "url"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="h-5 w-5 inline mr-2" />
              Image URL
            </button>
          </div>

          {uploadMethod === "upload" ? (
            /* File Upload */
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-xl cursor-pointer bg-accent/30 hover:bg-accent/50 transition-all group"
                >
                  {displayPreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={displayPreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          clearImage();
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-14 h-14 mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="mb-2 text-base text-foreground font-medium">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG, GIF up to 5MB (Recommended: 1280x720)
                      </p>
                    </div>
                  )}
                  <input
                    id="image-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* URL Input */
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-base font-medium">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, imageUrl: e.target.value }));
                  setImagePreview("");
                }}
                placeholder="https://example.com/course-image.jpg"
                className="h-14 text-base"
              />
              <p className="text-sm text-muted-foreground">
                A high-quality image URL that represents your course
              </p>

              {/* URL Image Preview */}
              {formData.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border relative">
                  <img
                    src={formData.imageUrl}
                    alt="Course preview"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="space-y-4 pt-6 border-t border-border">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
            <DollarSign className="h-6 w-6 text-primary" />
            Pricing
          </h3>

          {/* Is Paid Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border p-5 bg-accent/30">
            <div className="space-y-0.5">
              <Label htmlFor="isPaid" className="text-base font-medium">
                Paid Course
              </Label>
              <p className="text-sm text-muted-foreground">
                Charge students to access this course
              </p>
            </div>
            <Switch
              id="isPaid"
              checked={formData.isPaid}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPaid: checked }))}
            />
          </div>

          {/* Price Input (shown only if isPaid) */}
          {formData.isPaid && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <Label htmlFor="price" className="text-base font-medium">Price *</Label>
              <div className="flex items-center gap-2">
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                  className="h-14 px-5 rounded-lg border border-border bg-background text-base font-medium"
                >
                  <option value="USD">USD $</option>
                  <option value="EUR">EUR €</option>
                  <option value="GBP">GBP £</option>
                </select>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="29.99"
                  required={formData.isPaid}
                  className="h-14 text-base"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                The price students will pay for one-time access to this course
              </p>
            </div>
          )}

          {/* Free Course Message */}
          {!formData.isPaid && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-6 w-6 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-green-500 text-base">Free Course</p>
                  <p className="text-sm text-green-500/80 mt-1">
                    This course will be free for all community members
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${locale}/dashboard/communities/${slug}/courses`)}
          disabled={isLoading}
          className="h-12 px-6 text-base"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 px-6 text-base bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <BookOpen className="h-5 w-5 mr-2" />
              Create Course
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

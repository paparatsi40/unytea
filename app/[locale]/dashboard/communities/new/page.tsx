"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { createCommunity } from "@/app/actions/communities";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Settings as SettingsIcon,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";
import Image from "next/image";
import { BookOpen } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Basic Information",
    description: "Let's start with the essentials",
    icon: Users,
  },
  {
    id: 2,
    title: "Appearance",
    description: "Make it uniquely yours",
    icon: Palette,
  },
  {
    id: 3,
    title: "Layout & Theme",
    description: "Choose your style",
    icon: Sparkles,
  },
  {
    id: 4,
    title: "Settings",
    description: "Configure your community",
    icon: SettingsIcon,
  },
  {
    id: 5,
    title: "Preview",
    description: "Review before creating",
    icon: Sparkles,
  },
];

export default function NewCommunityPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [logoInputType, setLogoInputType] = useState<"upload" | "url">("upload");
  const [coverInputType, setCoverInputType] = useState<"upload" | "url">("upload");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState<{
    currentPlan: string;
    currentCount?: number;
    limit?: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    imageUrl: "",
    coverImageUrl: "",
    isPrivate: false,
    requireApproval: false,
    customDomain: "",
    subdomain: "",
    layoutType: "MODERN_GRID" as "MODERN_GRID" | "CLASSIC_FORUM" | "ACADEMY" | "DASHBOARD" | "MINIMALIST",
    primaryColor: "#8B5CF6",
    secondaryColor: "#EC4899",
    accentColor: "#F59E0B",
    fontFamily: "Inter",
    heroTitle: "",
    heroSubtitle: "",
  });

  // Uploadthing hook
  const { startUpload } = useUploadThing("communityBranding");

  const handleImageUpload = async (file: File, type: "logo" | "cover") => {
    try {
      if (type === "logo") {
        setUploadingLogo(true);
      } else {
        setUploadingCover(true);
      }

      const uploadedFiles = await startUpload([file]);
      
      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error("Upload failed");
      }

      const uploadedUrl = uploadedFiles[0].url;

      if (type === "logo") {
        setFormData({ ...formData, imageUrl: uploadedUrl });
      } else {
        setFormData({ ...formData, coverImageUrl: uploadedUrl });
      }

      toast.success(`${type === "logo" ? "Logo" : "Cover"} uploaded successfully!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${type === "logo" ? "logo" : "cover"}`);
    } finally {
      if (type === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingCover(false);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("You must be signed in to create a community");
      return;
    }

    if (!formData.name) {
      alert("Community name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate slug from name
      let slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Add random number to avoid duplicates
      const randomSuffix = Math.floor(Math.random() * 10000);
      slug = `${slug}-${randomSuffix}`;

      console.log("🚀 Creating community with data:", {
        name: formData.name,
        slug,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        coverImageUrl: formData.coverImageUrl || undefined,
        isPrivate: formData.isPrivate,
        requireApproval: formData.requireApproval,
      });

      // Call server action - wait for result
      const result = await createCommunity({
        name: formData.name,
        slug,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        coverImageUrl: formData.coverImageUrl || undefined,
        isPrivate: formData.isPrivate,
        requireApproval: formData.requireApproval,
        // Layout & Theme
        layoutType: formData.layoutType,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: formData.accentColor,
        fontFamily: formData.fontFamily,
        heroTitle: formData.heroTitle || undefined,
        heroSubtitle: formData.heroSubtitle || undefined,
      });

      console.log("📦 Server response:", result);

      // 🔐 CHECK IF LIMIT REACHED
      if (!result.success && result.limitReached) {
        setUpgradeModalData({
          currentPlan: "FREE", 
          currentCount: result.currentCount,
          limit: result.limit,
        });
        setShowUpgradeModal(true);
        setIsSubmitting(false);
        return;
      }

      if (result.success && result.community) {
        const redirectUrl = `/dashboard/communities/${result.community.slug}/feed`;
        console.log("✅ Community created! Redirecting to:", redirectUrl);
        console.log("✅ Membership ID:", result.membership?.id);
        
        // Use window.location.href to force a full page reload
        // This ensures no stale data from cache
        window.location.href = redirectUrl;
      } else {
        console.error("❌ Failed to create community:", result.error);
        alert(result.error || "Failed to create community");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("💥 Error creating community:", error);
      alert(error instanceof Error ? error.message : "Failed to create community");
      setIsSubmitting(false);
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  const isStepValid = () => {
    if (currentStep === 0) {
      return formData.name.length >= 3;
    }
    return true;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="flex items-center space-x-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Communities</span>
      </Button>

      {/* Progress */}
      <div className="flex items-center justify-between">
        {steps.map((s, index) => (
          <div key={s.id} className="flex flex-1 items-center">
            <div className="flex items-center space-x-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  index <= currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    index <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.title}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-0.5 flex-1 ${
                  index < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 flex items-start space-x-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
            <p className="mt-1 text-muted-foreground">{step.description}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 0 && (
            <>
              {/* Community Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Community Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="My Awesome Community"
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.name.length}/50 characters
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Tell people what your community is about..."
                  rows={4}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.description.length}/500 characters
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a category</option>
                  <option value="education">Education & Learning</option>
                  <option value="business">Business & Entrepreneurship</option>
                  <option value="tech">Technology & Programming</option>
                  <option value="health">Health & Fitness</option>
                  <option value="creative">Creative & Arts</option>
                  <option value="lifestyle">Lifestyle & Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              {/* Logo/Icon URL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Community Logo
                </label>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setLogoInputType("upload")}
                    variant={logoInputType === "upload" ? "default" : "outline"}
                    className="flex-1"
                  >
                    Upload
                  </Button>
                  <Button
                    onClick={() => setLogoInputType("url")}
                    variant={logoInputType === "url" ? "default" : "outline"}
                    className="flex-1"
                  >
                    URL
                  </Button>
                </div>
                {logoInputType === "upload" ? (
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageUpload(e.target.files[0], "logo");
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 mt-2"
                  />
                ) : (
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 mt-2"
                    placeholder="https://example.com/logo.png"
                  />
                )}
                {uploadingLogo && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploading...
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Square image recommended (e.g., 512x512)
                </p>
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Cover Image
                </label>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setCoverInputType("upload")}
                    variant={coverInputType === "upload" ? "default" : "outline"}
                    className="flex-1"
                  >
                    Upload
                  </Button>
                  <Button
                    onClick={() => setCoverInputType("url")}
                    variant={coverInputType === "url" ? "default" : "outline"}
                    className="flex-1"
                  >
                    URL
                  </Button>
                </div>
                {coverInputType === "upload" ? (
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageUpload(e.target.files[0], "cover");
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 mt-2"
                  />
                ) : (
                  <input
                    type="url"
                    value={formData.coverImageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, coverImageUrl: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 mt-2"
                    placeholder="https://example.com/cover.png"
                  />
                )}
                {uploadingCover && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploading...
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Wide image recommended (e.g., 1920x400)
                </p>
              </div>

              {/* Preview */}
              {(formData.imageUrl || formData.coverImageUrl) && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">
                    Preview
                  </p>
                  <div className="overflow-hidden rounded-lg">
                    <div className="relative h-32 bg-gradient-to-br from-primary/20 to-purple-500/20">
                      {formData.coverImageUrl && (
                        <img
                          src={formData.coverImageUrl}
                          alt="Cover"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {formData.imageUrl && (
                        <div className="absolute -bottom-6 left-6">
                          <div className="h-12 w-12 overflow-hidden rounded-xl border-4 border-background shadow-lg">
                            <img
                              src={formData.imageUrl}
                              alt="Logo preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-card p-6 pt-10">
                      <p className="font-semibold">{formData.name || "Community Name"}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              {/* Layout & Theme */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Layout Type
                </label>
                <select
                  value={formData.layoutType}
                  onChange={(e) =>
                    setFormData({ ...formData, layoutType: e.target.value as "MODERN_GRID" | "CLASSIC_FORUM" | "ACADEMY" | "DASHBOARD" | "MINIMALIST" })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="MODERN_GRID">Modern Grid - Pinterest style, visual-first</option>
                  <option value="CLASSIC_FORUM">Classic Forum - Traditional discussion layout</option>
                  <option value="ACADEMY">Academy - Course-focused educational</option>
                  <option value="DASHBOARD">Dashboard - Analytics and data-visible</option>
                  <option value="MINIMALIST">Minimalist - Clean, Notion-like</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can change this later in Settings → Appearance
                </p>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryColor: e.target.value })
                    }
                    className="h-12 w-full rounded-lg border border-border bg-background cursor-pointer"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      setFormData({ ...formData, secondaryColor: e.target.value })
                    }
                    className="h-12 w-full rounded-lg border border-border bg-background cursor-pointer"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) =>
                      setFormData({ ...formData, accentColor: e.target.value })
                    }
                    className="h-12 w-full rounded-lg border border-border bg-background cursor-pointer"
                  />
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Font Family
                </label>
                <select
                  value={formData.fontFamily}
                  onChange={(e) =>
                    setFormData({ ...formData, fontFamily: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Inter">Inter - Modern and clean</option>
                  <option value="Montserrat">Montserrat - Bold and friendly</option>
                  <option value="Open Sans">Open Sans - Professional and readable</option>
                </select>
              </div>

              {/* Hero Section */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Hero Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.heroTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, heroTitle: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Welcome to our community"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Hero Subtitle (Optional)
                </label>
                <textarea
                  value={formData.heroSubtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, heroSubtitle: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="This is a community for..."
                />
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              {/* Privacy Settings */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3 rounded-lg border border-border p-4">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={formData.isPrivate}
                    onChange={(e) =>
                      setFormData({ ...formData, isPrivate: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="isPrivate"
                      className="block text-sm font-medium text-foreground"
                    >
                      Private Community
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Only approved members can see the community content
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border border-border p-4">
                  <input
                    type="checkbox"
                    id="requireApproval"
                    checked={formData.requireApproval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requireApproval: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="requireApproval"
                      className="block text-sm font-medium text-foreground"
                    >
                      Require Approval for New Members
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      You'll need to approve each member before they can join
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Domain (Premium Feature) */}
              <div className="rounded-lg border border-border bg-accent/50 p-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Custom Domain
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Available on Professional plan and above
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className="space-y-6">
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Live Preview - This is how your community will look
                  </p>
                </div>

                {/* Preview Container */}
                <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden shadow-2xl">
                  {/* Hero Preview */}
                  <div 
                    className="relative overflow-hidden p-12"
                    style={{
                      background: `linear-gradient(135deg, ${formData.primaryColor}20 0%, ${formData.secondaryColor}20 50%, ${formData.accentColor}20 100%)`
                    }}
                  >
                    {formData.coverImageUrl && (
                      <div className="absolute inset-0 opacity-10">
                        <img
                          src={formData.coverImageUrl}
                          alt="Cover"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="relative text-center">
                      {formData.imageUrl && (
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-lg ring-4 ring-white">
                          <img
                            src={formData.imageUrl}
                            alt="Logo"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      
                      <h1 
                        className="mb-2 text-3xl font-bold"
                        style={{ color: formData.primaryColor }}
                      >
                        {formData.heroTitle || formData.name || "Your Community Name"}
                      </h1>
                      
                      <p className="text-gray-600 max-w-2xl mx-auto">
                        {formData.heroSubtitle || formData.description || "Your community description will appear here"}
                      </p>
                      
                      <button
                        type="button"
                        className="mt-6 px-8 py-3 rounded-full font-semibold text-white shadow-lg"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        Join Community
                      </button>
                      
                      {/* Mini Stats */}
                      <div className="mt-8 flex justify-center gap-8">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">1+</div>
                          <div className="text-sm text-gray-500">Members</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">0</div>
                          <div className="text-sm text-gray-500">Courses</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">0</div>
                          <div className="text-sm text-gray-500">Posts</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content Preview */}
                  <div className="p-8 bg-gray-50">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        What You'll Get Inside
                      </h2>
                      <p className="text-gray-600">Preview of member benefits</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                        <div 
                          className="mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                          style={{ backgroundColor: `${formData.primaryColor}20` }}
                        >
                          <BookOpen className="h-5 w-5" style={{ color: formData.primaryColor }} />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">Courses</div>
                        <div className="text-xs text-gray-500">Access premium content</div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                        <div 
                          className="mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                          style={{ backgroundColor: `${formData.secondaryColor}20` }}
                        >
                          <Users className="h-5 w-5" style={{ color: formData.secondaryColor }} />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">Community</div>
                        <div className="text-xs text-gray-500">Connect with peers</div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                        <div 
                          className="mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                          style={{ backgroundColor: `${formData.accentColor}20` }}
                        >
                          <Sparkles className="h-5 w-5" style={{ color: formData.accentColor }} />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">Live Events</div>
                        <div className="text-xs text-gray-500">Weekly sessions</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layout & Theme Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Selected Layout</div>
                    <div className="text-lg font-bold" style={{ color: formData.primaryColor }}>
                      {formData.layoutType.replace(/_/g, ' ')}
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Color Theme</div>
                    <div className="flex gap-2">
                      <div 
                        className="h-8 w-8 rounded-lg shadow-sm ring-2 ring-gray-200" 
                        style={{ backgroundColor: formData.primaryColor }}
                        title="Primary"
                      />
                      <div 
                        className="h-8 w-8 rounded-lg shadow-sm ring-2 ring-gray-200" 
                        style={{ backgroundColor: formData.secondaryColor }}
                        title="Secondary"
                      />
                      <div 
                        className="h-8 w-8 rounded-lg shadow-sm ring-2 ring-gray-200" 
                        style={{ backgroundColor: formData.accentColor }}
                        title="Accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          {currentStep > 0 && (
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="flex items-center space-x-2"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              className="ml-auto flex items-center space-x-2"
              disabled={!isStepValid()}
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="ml-auto flex items-center space-x-2"
              disabled={!isStepValid() || isSubmitting}
            >
              <Sparkles className="h-4 w-4" />
              <span>{isSubmitting ? "Creating..." : "Create Community"}</span>
            </Button>
          )}
        </div>
      </div>
      {showUpgradeModal && upgradeModalData && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Community Limit Reached"
          message="You've reached the maximum number of communities for your plan."
          currentPlan={upgradeModalData.currentPlan}
          limitType="communities"
          currentUsage={
            upgradeModalData.currentCount && upgradeModalData.limit
              ? {
                  current: upgradeModalData.currentCount,
                  limit: upgradeModalData.limit,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

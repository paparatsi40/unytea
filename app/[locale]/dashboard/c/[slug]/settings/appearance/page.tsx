"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Link as LinkIcon, 
  X, 
  Image as ImageIcon, 
  Check, 
  Layout as LayoutIcon, 
  Loader2, 
  Palette 
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useUploadThing } from "@/lib/uploadthing";

const LAYOUTS = [
  {
    id: "MODERN_GRID",
    name: "Modern Grid",
    description: "Pinterest-style, visual-first layout perfect for creative communities",
    preview: "/layouts/modern-grid.png",
    features: ["Masonry Grid", "Visual Hero", "Featured Content"]
  },
  {
    id: "CLASSIC_FORUM",
    name: "Classic Forum",
    description: "Reddit-style layout ideal for discussion-focused communities",
    preview: "/layouts/classic-forum.png",
    features: ["2-Column Layout", "Upvotes", "Pinned Posts"]
  },
  {
    id: "ACADEMY",
    name: "Academy",
    description: "Course-focused layout for educational communities",
    preview: "/layouts/academy.png",
    features: ["Course Grid", "Progress Tracking", "Instructor Profiles"]
  },
  {
    id: "DASHBOARD",
    name: "Dashboard",
    description: "Analytics-visible layout for data-driven communities",
    preview: "/layouts/dashboard.png",
    features: ["Metrics Cards", "Charts", "Activity Feed"]
  },
  {
    id: "MINIMALIST",
    name: "Minimalist",
    description: "Clean, Notion-style layout for content-first communities",
    preview: "/layouts/minimalist.png",
    features: ["Typography-focused", "Spacious", "Simple"]
  }
];

const COLOR_PRESETS = [
  { name: "Ocean", primary: "#0ea5e9", secondary: "#06b6d4", accent: "#3b82f6" },
  { name: "Forest", primary: "#10b981", secondary: "#059669", accent: "#34d399" },
  { name: "Sunset", primary: "#f59e0b", secondary: "#f97316", accent: "#fb923c" },
  { name: "Purple", primary: "#a855f7", secondary: "#9333ea", accent: "#c084fc" },
  { name: "Rose", primary: "#f43f5e", secondary: "#e11d48", accent: "#fb7185" },
  { name: "Indigo", primary: "#6366f1", secondary: "#4f46e5", accent: "#818cf8" }
];

export default function AppearanceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [layout, setLayout] = useState("MODERN_GRID");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoInputType, setLogoInputType] = useState<"upload" | "url">("upload");
  const [coverInputType, setCoverInputType] = useState<"upload" | "url">("upload");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Uploadthing hook
  const { startUpload, isUploading } = useUploadThing("communityBranding");

  // Load existing community data
  useEffect(() => {
    const loadCommunityData = async () => {
      try {
        const response = await fetch(`/api/communities/${slug}`);
        if (!response.ok) {
          throw new Error('Failed to load community data');
        }
        
        const { community } = await response.json();
        
        // Set existing values
        if (community.layoutType) setLayout(community.layoutType);
        if (community.primaryColor) setPrimaryColor(community.primaryColor);
        if (community.secondaryColor) setSecondaryColor(community.secondaryColor);
        if (community.accentColor) setAccentColor(community.accentColor);
        if (community.imageUrl) setLogoUrl(community.imageUrl);
        if (community.coverImageUrl) setCoverUrl(community.coverImageUrl);
        
      } catch (error) {
        console.error('Error loading community data:', error);
        toast.error('Failed to load community settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadCommunityData();
  }, [slug]);

  const handleImageUpload = async (
    file: File,
    type: "logo" | "cover"
  ) => {
    try {
      if (type === "logo") {
        setUploadingLogo(true);
      } else {
        setUploadingCover(true);
      }

      // Upload to Uploadthing
      const uploadedFiles = await startUpload([file]);
      
      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error("Upload failed");
      }

      const uploadedUrl = uploadedFiles[0].url;

      // Set the URL
      if (type === "logo") {
        setLogoUrl(uploadedUrl);
      } else {
        setCoverUrl(uploadedUrl);
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

  const handleUrlChange = (url: string, type: "logo" | "cover") => {
    if (type === "logo") {
      setLogoUrl(url);
    } else {
      setCoverUrl(url);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/communities/${slug}/branding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: logoUrl,
          coverImageUrl: coverUrl,
          primaryColor,
          secondaryColor,
          accentColor,
          layoutType: layout,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save changes');
      }

      const data = await response.json();
      
      toast.success("Theme saved successfully! Your community has been updated.");
      
      // Optionally redirect to community page to see changes
      // router.push(`/dashboard/c/${slug}`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Appearance</h1>
        <p className="text-muted-foreground">
          Make it uniquely yours
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Community Branding */}
          <div className="glass-strong rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Community Branding</h2>
              <p className="text-sm text-muted-foreground">
                Logo and cover image for your community
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-3">
              <Label>Community Logo</Label>
              
              {/* Tab switcher */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={logoInputType === "upload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogoInputType("upload")}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant={logoInputType === "url" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogoInputType("url")}
                  className="flex items-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  URL
                </Button>
              </div>

              {logoInputType === "upload" ? (
                <div className="space-y-3">
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => !uploadingLogo && document.getElementById("logo-upload")?.click()}
                  >
                    {uploadingLogo ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto">
                          <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        </div>
                        <p className="font-medium">Uploading logo...</p>
                      </div>
                    ) : logoUrl ? (
                      <div className="space-y-3">
                        <div className="relative w-32 h-32 mx-auto">
                          <Image
                            src={logoUrl}
                            alt="Logo preview"
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoUrl("");
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <ImageIcon className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Click to upload logo</p>
                          <p className="text-sm text-muted-foreground">
                            PNG, JPG, WebP (max 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "logo");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Square image recommended (e.g., 512x512)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => handleUrlChange(e.target.value, "logo")}
                  />
                  {logoUrl && (
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      <Image
                        src={logoUrl}
                        alt="Logo preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Square image recommended (e.g., 512x512)
                  </p>
                </div>
              )}
            </div>

            {/* Cover Upload */}
            <div className="space-y-3">
              <Label>Cover Image</Label>
              
              {/* Tab switcher */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={coverInputType === "upload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCoverInputType("upload")}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant={coverInputType === "url" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCoverInputType("url")}
                  className="flex items-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  URL
                </Button>
              </div>

              {coverInputType === "upload" ? (
                <div className="space-y-3">
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => !uploadingCover && document.getElementById("cover-upload")?.click()}
                  >
                    {uploadingCover ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto">
                          <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        </div>
                        <p className="font-medium">Uploading cover...</p>
                      </div>
                    ) : coverUrl ? (
                      <div className="space-y-3">
                        <div className="relative w-full h-48 mx-auto">
                          <Image
                            src={coverUrl}
                            alt="Cover preview"
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverUrl("");
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <ImageIcon className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Click to upload cover</p>
                          <p className="text-sm text-muted-foreground">
                            PNG, JPG, WebP (max 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "cover");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wide image recommended (e.g., 1920x400)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="https://example.com/cover.png"
                    value={coverUrl}
                    onChange={(e) => handleUrlChange(e.target.value, "cover")}
                  />
                  {coverUrl && (
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                      <Image
                        src={coverUrl}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Wide image recommended (e.g., 1920x400)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Layout Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <LayoutIcon className="h-5 w-5 text-sky-500" />
              <h2 className="text-xl font-semibold text-gray-900">Choose Layout</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setLayout(layout.id)}
                  disabled={isSaving}
                  className={`relative text-left border-2 rounded-lg p-4 transition-all hover:scale-105 ${
                    layout.id === layout
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-200 hover:border-sky-300"
                  }`}
                >
                  {/* Preview Image Placeholder */}
                  <div className="bg-gradient-to-br from-sky-100 to-purple-100 rounded-lg h-32 mb-3 flex items-center justify-center">
                    <LayoutIcon className="h-12 w-12 text-sky-500" />
                  </div>

                  {/* Layout Info */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{layout.name}</h3>
                    {layout.id === layout && (
                      <Check className="h-5 w-5 text-sky-500 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{layout.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1">
                    {layout.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Customization */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Palette className="h-5 w-5 text-sky-500" />
              <h2 className="text-xl font-semibold text-gray-900">Theme Colors</h2>
            </div>

            {/* Color Presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Presets
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                      setAccentColor(preset.accent);
                    }}
                    className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-sky-300 transition-all"
                  >
                    <div className="flex gap-1">
                      <div
                        className="h-6 w-6 rounded"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="h-6 w-6 rounded"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <div
                        className="h-6 w-6 rounded"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Theme
              </button>
            </div>
          </div>

          {/* Preview Notice */}
          <div className="mt-6 bg-sky-50 border border-sky-200 rounded-lg p-4">
            <p className="text-sm text-sky-800">
              Visit your community page to see the changes in action!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
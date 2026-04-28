"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ResourceGrid } from "@/components/library/ResourceGrid";
import { CategorySidebar } from "@/components/library/CategorySidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Library,
  Upload,
  TrendingUp,
  Clock,
  Sparkles,
  BookOpen,
  X,
  Plus,
} from "lucide-react";
import {
  getResources,
  getResourceCategories,
  getPopularResources,
  getContinueWatching,
  toggleResourceLike,
  deleteResource,
  createResource,
  createResourceCategory,
} from "@/app/actions/resources";
import { FileUpload } from "@/components/upload/FileUpload";
import { toast } from "sonner";
import type { ResourceType } from "@prisma/client";

export default function LibraryPage() {
  const params = useParams();
  const communitySlug = params?.slug as string | undefined;
  const t = useTranslations("library");

  // State - MUST declare all hooks before any early returns
  const [resources, setResources] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [popularResources, setPopularResources] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState<{
    type?: ResourceType;
    sortBy: "createdAt" | "updatedAt" | "viewCount" | "title";
    sortOrder: "asc" | "desc";
    search?: string;
  }>({
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: false,
    total: 0,
  });

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    type: "DOCUMENT" as ResourceType,
    categoryId: "",
    fileUrl: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create category inline state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategorySubmitting, setIsCreatingCategorySubmitting] = useState(false);

  // NOTE: All hooks (useCallback, useEffect) must be called before any early return
  // (Rules of Hooks). The "Community not found" guard moved further down.

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resourcesResult, categoriesResult, popularResult, continueResult] =
        await Promise.all([
          getResources({
            communitySlug,
            page: 1,
            limit: 20,
            ...filters,
            categoryId: selectedCategory === "uncategorized" ? undefined : selectedCategory || undefined,
          }),
          getResourceCategories(communitySlug),
          getPopularResources(communitySlug, 5),
          getContinueWatching(communitySlug, 5),
        ]);

      if (resourcesResult.success) {
        setResources(resourcesResult.data.resources);
        setPagination({
          page: 1,
          hasMore: resourcesResult.data.hasMore,
          total: resourcesResult.data.total,
        });
      }

      if (categoriesResult.success) {
        setCategories(categoriesResult.data);
      }

      if (popularResult.success) {
        setPopularResources(popularResult.data);
      }

      if (continueResult.success) {
        setContinueWatching(continueResult.data);
      }
    } catch (error) {
      console.error("Error fetching library data:", error);
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [communitySlug, filters, selectedCategory, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: {
      type?: ResourceType | "ALL";
      sortBy?: "createdAt" | "updatedAt" | "viewCount" | "title";
      sortOrder?: "asc" | "desc";
    }) => {
      setFilters((prev) => ({
        ...prev,
        type: newFilters.type === "ALL" ? undefined : newFilters.type,
        sortBy: newFilters.sortBy ?? prev.sortBy,
        sortOrder: newFilters.sortOrder ?? prev.sortOrder,
      }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    []
  );

  const handleLoadMore = useCallback(async () => {
    const nextPage = pagination.page + 1;
    const result = await getResources({
      communitySlug,
      page: nextPage,
      limit: 20,
      ...filters,
    });

    if (result.success) {
      setResources((prev) => [...prev, ...result.data.resources]);
      setPagination({
        page: nextPage,
        hasMore: result.data.hasMore,
        total: result.data.total,
      });
    }
  }, [communitySlug, filters, pagination.page]);

  const handleLike = useCallback(async (resourceId: string) => {
    const result = await toggleResourceLike({ resourceId });
    if (result.success) {
      toast.success(result.data.liked ? t("like.liked") : t("like.unliked"));
      setResources((prev) =>
        prev.map((r) =>
          r.id === resourceId
            ? {
                ...r,
                _count: { likes: result.data.likesCount },
                likes: result.data.liked ? [{ id: "temp" }] : [],
              }
            : r
        )
      );
    }
  }, [t]);

  const handleDelete = useCallback(async (resourceId: string) => {
    if (!confirm(t("delete.confirm"))) {
      return;
    }

    const result = await deleteResource(resourceId);
    if (result.success) {
      toast.success(t("delete.success"));
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } else {
      toast.error(result.error);
    }
  }, [t]);

  // Early return after ALL hooks are declared (Rules of Hooks).
  if (!communitySlug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Community not found</p>
      </div>
    );
  }

  // Filter resources based on active tab
  const getFilteredResources = () => {
    switch (activeTab) {
      case "popular":
        return popularResources;
      case "continue":
        return continueWatching;
      default:
        return resources;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                  <Library className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{t("title")}</h1>
                  <p className="text-muted-foreground">
                    {t("subtitle")}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                {t("myFavorites")}
              </Button>
              <Button
                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload className="w-4 h-4" />
                {t("uploadResource")}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-6"
          >
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all" className="gap-2">
                <BookOpen className="w-4 h-4" />
                {t("tabs.all")}
              </TabsTrigger>
              <TabsTrigger value="popular" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                {t("tabs.popular")}
              </TabsTrigger>
              <TabsTrigger value="continue" className="gap-2">
                <Clock className="w-4 h-4" />
                {t("tabs.continueWatching")}
                {continueWatching.length > 0 && (
                  <span className="ml-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {continueWatching.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2">
                <Sparkles className="w-4 h-4" />
                {t("tabs.new")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <CategorySidebar
                categories={categories}
                selectedCategoryId={selectedCategory}
                onSelectCategory={setSelectedCategory}
                totalResources={pagination.total}
                canManage={true}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <ResourceGrid
              resources={getFilteredResources()}
              communitySlug={communitySlug}
              isLoading={isLoading}
              hasMore={pagination.hasMore}
              onLoadMore={handleLoadMore}
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              onLike={handleLike}
              onDelete={handleDelete}
              totalCount={pagination.total}
              canEdit={true}
            />
          </main>
        </div>
      </div>

      {/* Upload Resource Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  {t("upload.title")}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t("upload.subtitle")}
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e: React.FormEvent) => {
                e.preventDefault();
                if (!communitySlug) return;

                setIsSubmitting(true);

                const fileUrl = uploadedFiles[0]?.url || uploadForm.fileUrl;

                if (!fileUrl) {
                  toast.error(t("upload.noFileError"));
                  setIsSubmitting(false);
                  return;
                }

                const result = await createResource(communitySlug, {
                  title: uploadForm.title,
                  description: uploadForm.description,
                  type: uploadForm.type,
                  categoryId: uploadForm.categoryId || undefined,
                  fileUrl: fileUrl,
                  slug: uploadForm.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now(),
                  tags: [],
                  isPublic: false,
                  status: "PUBLISHED",
                });

                if (result.success) {
                  toast.success(t("upload.success"));
                  setIsUploadModalOpen(false);
                  setUploadForm({
                    title: "",
                    description: "",
                    type: "DOCUMENT",
                    categoryId: "",
                    fileUrl: "",
                  });
                  setUploadedFiles([]);
                  fetchData();
                } else {
                  console.error("createResource failed:", result.error, result.code);
                  toast.error(result.error || t("upload.error"));
                }

                setIsSubmitting(false);
              }}
              className="p-6 space-y-6"
            >
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t("upload.titleLabel")}</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder={t("upload.titlePlaceholder")}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t("upload.descriptionLabel")}</Label>
                <textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder={t("upload.descriptionPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">{t("upload.typeLabel")}</Label>
                <Select
                  value={uploadForm.type}
                  onValueChange={(value: string) => setUploadForm({ ...uploadForm, type: value as ResourceType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("upload.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCUMENT">{t("upload.typeDocument")}</SelectItem>
                    <SelectItem value="VIDEO">{t("upload.typeVideo")}</SelectItem>
                    <SelectItem value="AUDIO">{t("upload.typeAudio")}</SelectItem>
                    <SelectItem value="IMAGE">{t("upload.typeImage")}</SelectItem>
                    <SelectItem value="LINK">{t("upload.typeLink")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">{t("upload.categoryLabel")}</Label>
                  {!isCreatingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(true)}
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {t("upload.categoryNew")}
                    </button>
                  )}
                </div>

                {isCreatingCategory ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("upload.categoryPlaceholder")}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (!newCategoryName.trim() || !communitySlug) return;

                        setIsCreatingCategorySubmitting(true);
                        const result = await createResourceCategory(communitySlug, {
                          name: newCategoryName.trim(),
                          slug: newCategoryName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                          description: null,
                          icon: null,
                          color: null,
                          position: 0,
                        });

                        if (result.success && result.data) {
                          toast.success(t("upload.categoryCreated"));
                          setCategories([...categories, result.data]);
                          setUploadForm({ ...uploadForm, categoryId: result.data.id });
                          setNewCategoryName("");
                          setIsCreatingCategory(false);
                        } else if (!result.success) {
                          toast.error(result.error || t("upload.categoryError"));
                        }
                        setIsCreatingCategorySubmitting(false);
                      }}
                      disabled={!newCategoryName.trim() || isCreatingCategorySubmitting}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {isCreatingCategorySubmitting ? "..." : t("upload.categoryNew")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsCreatingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={uploadForm.categoryId || "none"}
                    onValueChange={(value: string) => setUploadForm({ ...uploadForm, categoryId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("upload.categorySelectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("upload.categoryNone")}</SelectItem>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-gray-400 italic">
                          {t("upload.categoryEmpty")}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>{t("upload.fileLabel")}</Label>
                <FileUpload
                  endpoint={uploadForm.type === "DOCUMENT" ? "documentUploader" : uploadForm.type === "VIDEO" || uploadForm.type === "AUDIO" ? "mediaUploader" : "imageUploader"}
                  onUploadComplete={(files) => setUploadedFiles(files)}
                  onUploadError={(error: Error) => toast.error(error.message)}
                  maxFiles={1}
                  value={uploadedFiles}
                  onChange={setUploadedFiles}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("upload.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!uploadForm.title || uploadedFiles.length === 0 || isSubmitting}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {t("upload.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t("upload.submit")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ResourceGrid } from "@/components/library/ResourceGrid";
import { CategorySidebar } from "@/components/library/CategorySidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Library,
  Upload,
  TrendingUp,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  getResources,
  getResourceCategories,
  getPopularResources,
  getContinueWatching,
  toggleResourceLike,
  deleteResource,
} from "@/app/actions/resources";
import { toast } from "sonner";
import type { ResourceType } from "@prisma/client";

export default function LibraryPage() {
  const params = useParams();
  const communitySlug = params?.slug as string | undefined;

  if (!communitySlug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Community not found</p>
      </div>
    );
  }

  // State
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
      toast.error("Error al cargar la biblioteca");
    } finally {
      setIsLoading(false);
    }
  }, [communitySlug, filters, selectedCategory]);

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
        sortBy: newFilters.sortBy,
        sortOrder: newFilters.sortOrder,
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
      toast.success(result.data.liked ? "¡Te gusta este recurso!" : "Like removido");
      // Update local state
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
  }, []);

  const handleDelete = useCallback(async (resourceId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este recurso?")) {
      return;
    }

    const result = await deleteResource(resourceId);
    if (result.success) {
      toast.success("Recurso eliminado");
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } else {
      toast.error(result.error);
    }
  }, []);

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
                  <h1 className="text-3xl font-bold">Biblioteca</h1>
                  <p className="text-muted-foreground">
                    Explora todos los recursos de la comunidad
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Mis favoritos
              </Button>
              <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Upload className="w-4 h-4" />
                Subir recurso
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
                Todos
              </TabsTrigger>
              <TabsTrigger value="popular" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Populares
              </TabsTrigger>
              <TabsTrigger value="continue" className="gap-2">
                <Clock className="w-4 h-4" />
                Continuar viendo
                {continueWatching.length > 0 && (
                  <span className="ml-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {continueWatching.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Nuevos
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
    </div>
  );
}

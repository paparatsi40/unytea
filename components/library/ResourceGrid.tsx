"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ResourceCard } from "./ResourceCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Headphones,
  Video,
  FileText,
  ExternalLink,
  Search,
  Grid3X3,
  List,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResourceType } from "@prisma/client";

interface ResourceGridProps {
  resources: any[];
  communitySlug: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: {
    type?: ResourceType | "ALL";
    sortBy?: "createdAt" | "updatedAt" | "viewCount" | "title";
    sortOrder?: "asc" | "desc";
  }) => void;
  canEdit?: boolean;
  onLike?: (resourceId: string) => void;
  onDelete?: (resourceId: string) => void;
  totalCount?: number;
}

export function ResourceGrid({
  resources,
  communitySlug,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onSearch,
  onFilterChange,
  canEdit = false,
  onLike,
  onDelete,
  totalCount,
}: ResourceGridProps) {
  const t = useTranslations("library.grid");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ResourceType | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "viewCount" | "title">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const typeFilters = [
    { value: "ALL", label: t("filterAll"), icon: Grid3X3 },
    { value: "AUDIO", label: t("filterAudio"), icon: Headphones },
    { value: "VIDEO", label: t("filterVideo"), icon: Video },
    { value: "DOCUMENT", label: t("filterDocuments"), icon: FileText },
    { value: "LINK", label: t("filterLinks"), icon: ExternalLink },
  ];

  const sortOptions = [
    { value: "createdAt", label: t("sortNewest") },
    { value: "updatedAt", label: t("sortUpdated") },
    { value: "viewCount", label: t("sortViews") },
    { value: "title", label: t("sortTitle") },
  ];

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  const handleTypeChange = useCallback(
    (value: ResourceType | "ALL") => {
      setSelectedType(value);
      onFilterChange?.({ type: value, sortBy, sortOrder });
    },
    [onFilterChange, sortBy, sortOrder]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const newSortBy = value as typeof sortBy;
      setSortBy(newSortBy);
      onFilterChange?.({ type: selectedType, sortBy: newSortBy, sortOrder });
    },
    [onFilterChange, selectedType, sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);
    onFilterChange?.({ type: selectedType, sortBy, sortOrder: newOrder });
  }, [onFilterChange, selectedType, sortBy, sortOrder]);

  // Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 w-full lg:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-11 bg-background/50"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-background/50">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px] h-10">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={toggleSortOrder}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                sortOrder === "asc" && "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {typeFilters.map((filter) => {
          const Icon = filter.icon;
          const isActive = selectedType === filter.value;

          return (
            <motion.button
              key={filter.value}
              onClick={() => handleTypeChange(filter.value as ResourceType | "ALL")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                "transition-colors duration-200 whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className="w-4 h-4" />
              {filter.label}
              {filter.value !== "ALL" && totalCount !== undefined && (
                <span className="ml-1 opacity-70">
                  (
                  {
                    resources.filter((r) => r.type === filter.value).length
                  }
                  )
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {resources.length} {resources.length === 1 ? t("resource") : t("resources")}
          {totalCount !== undefined && totalCount > resources.length && (
            <span> {t("of")} {totalCount}</span>
          )}
        </p>
      </div>

      {/* Resource Grid */}
      <AnimatePresence mode="popLayout">
        {resources.length > 0 ? (
          <motion.div
            layout
            className={cn(
              "grid gap-6",
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}
          >
            {resources.map((resource, index) => (
              <motion.div
                key={resource.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <ResourceCard
                  resource={resource}
                  communitySlug={communitySlug}
                  canEdit={canEdit}
                  onLike={() => onLike?.(resource.id)}
                  onDelete={() => onDelete?.(resource.id)}
                  variant={viewMode === "list" ? "compact" : "default"}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("noResults")}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchQuery
                ? t("noResultsSearch")
                : t("noResultsEmpty")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={isLoading}
            className="min-w-[200px]"
          >
            {isLoading ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

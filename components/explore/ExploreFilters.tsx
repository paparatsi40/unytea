"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { CommunityCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ExploreFilters as ExploreFiltersType, ExploreSize, ExploreSort, ExploreType } from "@/types/explore";
import { CATEGORY_LABELS } from "./CommunityCard";

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "de", label: "Deutsch" },
];

const SIZE_OPTIONS: { value: ExploreSize; label: string }[] = [
  { value: "all", label: "All" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const TYPE_OPTIONS: { value: ExploreType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const SORT_OPTIONS: { value: ExploreSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most-members", label: "Most members" },
  { value: "most-active", label: "Most active" },
];

const DEBOUNCE_MS = 300;

const STRINGS = {
  searchPlaceholder: "Search communities...",
  allCategories: "All categories",
  allLanguages: "All languages",
  sortLabel: "Sort by",
  clearAll: "Clear all filters",
  resultsCount: (count: number) => `${count.toLocaleString()} communities`,
};

type ExploreFiltersProps = {
  currentFilters: ExploreFiltersType;
  totalResults: number;
};

function isFilterActive(filters: ExploreFiltersType): boolean {
  return Boolean(
    filters.category ||
      filters.language ||
      (filters.size && filters.size !== "all") ||
      (filters.type && filters.type !== "all") ||
      filters.search ||
      (filters.sort && filters.sort !== "newest")
  );
}

export function ExploreFilters({ currentFilters, totalResults }: ExploreFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentFilters.search ?? "");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local search state if URL changes externally (back/forward).
  useEffect(() => {
    setSearchValue(currentFilters.search ?? "");
  }, [currentFilters.search]);

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page"); // reset pagination on any filter change
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  const handleSearchChange = useCallback(
    (next: string) => {
      setSearchValue(next);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        updateFilter("search", next.trim() || null);
      }, DEBOUNCE_MS);
    },
    [updateFilter]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const clearAll = useCallback(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearchValue("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  const showClear = isFilterActive(currentFilters);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-4 border-b bg-background px-4 py-3 lg:mx-0 lg:px-0",
        isPending && "opacity-70"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{STRINGS.resultsCount(totalResults)}</span>
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={STRINGS.searchPlaceholder}
            className="pl-9"
            aria-label={STRINGS.searchPlaceholder}
          />
        </div>

        {/* Category */}
        <Select
          value={currentFilters.category ?? "all"}
          onValueChange={(v) => updateFilter("category", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-auto min-w-[180px] h-10">
            <SelectValue placeholder={STRINGS.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{STRINGS.allCategories}</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as CommunityCategory[]).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language */}
        <Select
          value={currentFilters.language ?? "all"}
          onValueChange={(v) => updateFilter("language", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-auto min-w-[140px] h-10">
            <SelectValue placeholder={STRINGS.allLanguages} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{STRINGS.allLanguages}</SelectItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Size pill group */}
        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          {SIZE_OPTIONS.map((opt) => {
            const active = (currentFilters.size ?? "all") === opt.value;
            return (
              <Button
                key={opt.value}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => updateFilter("size", opt.value)}
                className={cn("h-7 px-2.5 text-xs", active && "font-semibold")}
                aria-pressed={active}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>

        {/* Type pill group */}
        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          {TYPE_OPTIONS.map((opt) => {
            const active = (currentFilters.type ?? "all") === opt.value;
            return (
              <Button
                key={opt.value}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => updateFilter("type", opt.value)}
                className={cn("h-7 px-2.5 text-xs", active && "font-semibold")}
                aria-pressed={active}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>

        {/* Sort */}
        <Select
          value={currentFilters.sort ?? "newest"}
          onValueChange={(v) => updateFilter("sort", v === "newest" ? null : v)}
        >
          <SelectTrigger className="w-auto min-w-[150px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear all */}
        {showClear && (
          <Button
            variant="link"
            size="sm"
            onClick={clearAll}
            className="ml-auto h-auto px-1 text-xs"
          >
            <X className="h-3 w-3" aria-hidden />
            {STRINGS.clearAll}
          </Button>
        )}
      </div>
    </div>
  );
}

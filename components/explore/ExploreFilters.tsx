"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { CommunityCategory } from "@prisma/client";
import { useTranslations } from "next-intl";
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
import type {
  ExploreFilters as ExploreFiltersType,
  ExploreSize,
  ExploreSort,
  ExploreType,
} from "@/types/explore";

const LANGUAGE_OPTIONS: { value: string; labelKey: "english" | "spanish" | "french" | "portuguese" | "german" }[] = [
  { value: "en", labelKey: "english" },
  { value: "es", labelKey: "spanish" },
  { value: "fr", labelKey: "french" },
  { value: "pt", labelKey: "portuguese" },
  { value: "de", labelKey: "german" },
];

// Static language names — these are endonyms (each language in its own form)
// so they don't get translated. Same in en/es/fr UIs.
const LANGUAGE_LABELS: Record<(typeof LANGUAGE_OPTIONS)[number]["labelKey"], string> = {
  english: "English",
  spanish: "Español",
  french: "Français",
  portuguese: "Português",
  german: "Deutsch",
};

const SIZE_VALUES: ExploreSize[] = ["all", "small", "medium", "large"];
const TYPE_VALUES: ExploreType[] = ["all", "free", "paid"];
const SORT_VALUES: ExploreSort[] = ["newest", "most-members", "most-active"];

const DEBOUNCE_MS = 300;

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
  const t = useTranslations("explore.filters");
  const tCat = useTranslations("explore.categories");

  // Map plain ExploreSize/Type/Sort enum values to translation keys.
  const sizeLabel = (v: ExploreSize) =>
    v === "all" ? t("allSizes") : t(v as "small" | "medium" | "large");
  const typeLabel = (v: ExploreType) =>
    v === "all" ? t("allTypes") : t(v as "free" | "paid");
  const sortLabel = (v: ExploreSort) =>
    v === "newest" ? t("newest") : v === "most-members" ? t("mostMembers") : t("mostActive");

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
      params.delete("page");
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
        <span className="text-sm text-muted-foreground">
          {t("resultsCount", { count: totalResults })}
        </span>
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>

        <Select
          value={currentFilters.category ?? "all"}
          onValueChange={(v) => updateFilter("category", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-auto min-w-[180px] h-10">
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {(Object.keys(CommunityCategory) as CommunityCategory[]).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {tCat(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentFilters.language ?? "all"}
          onValueChange={(v) => updateFilter("language", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-auto min-w-[140px] h-10">
            <SelectValue placeholder={t("allLanguages")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allLanguages")}</SelectItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {LANGUAGE_LABELS[lang.labelKey]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          {SIZE_VALUES.map((v) => {
            const active = (currentFilters.size ?? "all") === v;
            return (
              <Button
                key={v}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => updateFilter("size", v)}
                className={cn("h-7 px-2.5 text-xs", active && "font-semibold")}
                aria-pressed={active}
              >
                {sizeLabel(v)}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          {TYPE_VALUES.map((v) => {
            const active = (currentFilters.type ?? "all") === v;
            return (
              <Button
                key={v}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => updateFilter("type", v)}
                className={cn("h-7 px-2.5 text-xs", active && "font-semibold")}
                aria-pressed={active}
              >
                {typeLabel(v)}
              </Button>
            );
          })}
        </div>

        <Select
          value={currentFilters.sort ?? "newest"}
          onValueChange={(v) => updateFilter("sort", v === "newest" ? null : v)}
        >
          <SelectTrigger className="w-auto min-w-[150px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {sortLabel(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showClear && (
          <Button
            variant="link"
            size="sm"
            onClick={clearAll}
            className="ml-auto h-auto px-1 text-xs"
          >
            <X className="h-3 w-3" aria-hidden />
            {t("clearAll")}
          </Button>
        )}
      </div>
    </div>
  );
}

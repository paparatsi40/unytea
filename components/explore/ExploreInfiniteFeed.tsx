"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, SearchX } from "lucide-react";
import { loadMoreCommunitiesAction } from "@/app/[locale]/explore/actions";
import { cn } from "@/lib/utils";
import type { ExploreCommunity, ExploreFilters, ExploreResponse } from "@/types/explore";
import { CommunityCard } from "./CommunityCard";

type ExploreInfiniteFeedProps = {
  initialData: ExploreResponse;
  currentFilters: ExploreFilters;
  locale: string;
};

const SENTINEL_ROOT_MARGIN = "200px";
const SKELETON_COUNT = 4;
const LCP_PRIORITY_CARDS = 4;

const STRINGS = {
  emptyTitle: "No communities match",
  emptyDescription: "Try adjusting your filters to see more results.",
  endOfResults: "You've reached the end",
  errorTitle: "Failed to load more",
  errorDescription: "Try refreshing the page.",
};

function CommunityCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="h-32 animate-pulse bg-muted" />
      <div className="space-y-2 px-4 pb-3.5 pt-7">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
      <SearchX className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden />
      <h3 className="mb-1 text-base font-medium">{STRINGS.emptyTitle}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{STRINGS.emptyDescription}</p>
    </div>
  );
}

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="col-span-full flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">{STRINGS.errorTitle}</p>
        <p className="text-xs opacity-80">{STRINGS.errorDescription}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-medium underline-offset-2 hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

export function ExploreInfiniteFeed({
  initialData,
  currentFilters,
  locale,
}: ExploreInfiniteFeedProps) {
  const [communities, setCommunities] = useState<ExploreCommunity[]>(initialData.communities);
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset on initialData change (filter URL transitions trigger fresh server render).
  useEffect(() => {
    setCommunities(initialData.communities);
    setCurrentPage(initialData.page);
    setHasMore(initialData.hasMore);
    setError(null);
  }, [initialData]);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await loadMoreCommunitiesAction(currentFilters, {
        page: currentPage + 1,
        pageSize: initialData.pageSize,
      });
      setCommunities((prev) => [...prev, ...next.communities]);
      setCurrentPage(next.page);
      setHasMore(next.hasMore);
    } catch (err) {
      console.error("Failed to load more communities", err);
      setError("load_more_failed");
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, currentPage, initialData.pageSize]);

  // IntersectionObserver: trigger loadMore when sentinel enters viewport.
  useEffect(() => {
    if (!hasMore || isLoading || error) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: SENTINEL_ROOT_MARGIN }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, error, loadMore]);

  const isEmpty = communities.length === 0 && !isLoading;

  return (
    <div>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {communities.map((c, i) => (
              <CommunityCard
                key={c.id}
                community={c}
                locale={locale}
                priority={i < LCP_PRIORITY_CARDS}
              />
            ))}
            {isLoading &&
              Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <CommunityCardSkeleton key={`skeleton-${i}`} />
              ))}
          </>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBanner onRetry={loadMore} />
        </div>
      )}

      {/* Sentinel: triggers loadMore when intersecting. */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {!hasMore && !isEmpty && !isLoading && !error && (
        <p className="mt-8 text-center text-sm text-muted-foreground">{STRINGS.endOfResults}</p>
      )}

      {isLoading && !error && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">Loading more communities</span>
        </p>
      )}
    </div>
  );
}

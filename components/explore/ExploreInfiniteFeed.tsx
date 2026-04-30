"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CommunityCard, type CommunityCardData } from "@/components/explore/CommunityCard";

/**
 * The infinite feed renders the same CommunityCard the server-rendered
 * sections do, so the entire /explore page looks consistent. We only keep
 * pagination state and impression/click analytics here — the visual is owned
 * by CommunityCard.
 */

type FeedItem = CommunityCardData & {
  /** Optional ranking score returned by the server; not displayed. */
  rankingScore?: number;
};

type Props = {
  locale: string;
  initialItems: FeedItem[];
  initialCursor: number | null;
  filters: {
    q: string;
    category: string;
    monetization: string;
    language: string;
    sessionsWeek: string;
    sort: string;
  };
};

function trackExploreEvent(payload: Record<string, unknown>) {
  void fetch("/api/explore/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function ExploreInfiniteFeed({
  locale,
  initialItems,
  initialCursor,
  filters,
}: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCursor !== null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const impressedRef = useRef<Set<string>>(new Set());

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.monetization !== "all") params.set("monetization", filters.monetization);
    if (filters.language !== "all") params.set("language", filters.language);
    if (filters.sessionsWeek !== "all") params.set("sessionsWeek", filters.sessionsWeek);
    if (filters.sort !== "trending") params.set("sort", filters.sort);
    return params;
  }, [filters]);

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setHasMore(initialCursor !== null);
    impressedRef.current = new Set();
  }, [initialItems, initialCursor]);

  // Fire one impression event per card the first time it appears. We don't
  // bother with viewport observation here — keeping parity with the prior
  // behavior where impressions were logged at render time.
  useEffect(() => {
    for (const [index, item] of items.entries()) {
      if (impressedRef.current.has(item.id)) continue;
      impressedRef.current.add(item.id);
      trackExploreEvent({
        eventName: "community_card_impression",
        communityId: item.id,
        communitySlug: item.slug,
        source: "explore_infinite_feed",
        rank: index + 1,
        sort: filters.sort,
        locale,
      });
    }
  }, [items, filters.sort, locale]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || isLoading || !hasMore || cursor === null) return;

        setIsLoading(true);
        const params = new URLSearchParams(query);
        params.set("cursor", String(cursor));
        params.set("limit", "12");

        fetch(`/api/explore/feed?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => {
            if (!data?.success) return;
            setItems((prev) => [...prev, ...((data.items as FeedItem[]) || [])]);
            setCursor(data.nextCursor ?? null);
            setHasMore(Boolean(data.hasMore));
          })
          .finally(() => setIsLoading(false));
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [cursor, hasMore, isLoading, query]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((community, index) => (
          <div
            key={community.id}
            onClickCapture={() =>
              trackExploreEvent({
                eventName: "community_card_click",
                communityId: community.id,
                communitySlug: community.slug,
                source: "explore_infinite_feed",
                rank: index + 1,
                sort: filters.sort,
                locale,
              })
            }
          >
            <CommunityCard
              community={community}
              locale={locale}
              linkSrc="explore_card"
              rank={index + 1}
              sort={filters.sort}
            />
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-8" />
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading more communities…</p>
      )}
      {!hasMore && items.length > 0 && (
        <p className="text-sm text-muted-foreground">You reached the end of Explore.</p>
      )}
    </>
  );
}

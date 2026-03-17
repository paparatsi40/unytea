"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type FeedItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPaid: boolean;
  owner: { name: string | null; firstName: string | null; lastName: string | null };
  membersCount: number;
  nextSession: { id: string; title: string; scheduledAt: string | Date } | null;
  nextSessionAttending: number;
  sessionsThisWeek: number;
  postsLast7d: number;
  newMembersLast7d: number;
  isNew: boolean;
  rankingScore: number;
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

function hostName(owner: FeedItem["owner"]) {
  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return fullName || owner.name || "Unytea Host";
}

function formatSessionSlot(dateLike: string | Date) {
  const date = new Date(dateLike);
  return date.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function trackExploreEvent(payload: Record<string, unknown>) {
  void fetch("/api/explore/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function ExploreInfiniteFeed({ locale, initialItems, initialCursor, filters }: Props) {
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
            setItems((prev) => [...prev, ...(data.items || [])]);
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
        {items.map((community, index) => {
          const nextSessionText = community.nextSession
            ? `Next: ${formatSessionSlot(community.nextSession.scheduledAt)}`
            : "New sessions every week";

          const socialProof = community.nextSessionAttending > 0
            ? `${community.nextSessionAttending} attending`
            : community.sessionsThisWeek > 0
              ? "Weekly sessions"
              : community.isNew
                ? "Be one of the first members"
                : "Growing community";

          const tagBadges = [
            community.isNew ? "🆕 New" : null,
            community.sessionsThisWeek > 0 ? "📅 Weekly sessions" : null,
            community.postsLast7d >= 3 ? "💬 Active" : null,
            community.newMembersLast7d >= 3 ? "📈 Growing" : null,
          ].filter(Boolean) as string[];

          const href = `/${locale}/community/${community.slug}?src=explore_card&rank=${index + 1}&sort=${filters.sort}`;

          return (
            <Link
              key={community.id}
              href={href}
              onClick={() =>
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
              className="group rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{community.isPaid ? "Paid access" : "Free access"}</Badge>
                {tagBadges.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-foreground">{community.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {community.description?.trim() || "Learn with live sessions and community."}
              </p>

              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>👤 {hostName(community.owner)} (Host)</p>
                <p>👥 {community.membersCount} members</p>
                <p>🟢 {nextSessionText}</p>
                <p>🔥 {socialProof}</p>
              </div>

              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                View community <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-8" />
      {isLoading && <p className="text-sm text-muted-foreground">Loading more communities…</p>}
      {!hasMore && items.length > 0 && (
        <p className="text-sm text-muted-foreground">You reached the end of Explore.</p>
      )}
    </>
  );
}

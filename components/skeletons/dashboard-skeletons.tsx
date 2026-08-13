import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared building blocks for the dashboard's `loading.tsx` files.
 *
 * Every dashboard route fetches on the server, so before this existed a
 * navigation showed nothing at all until the data landed — which reads as a
 * hung app rather than a loading one. Each route now suspends into a skeleton
 * shaped like the page it is about to become.
 *
 * They live together rather than inline in each `loading.tsx` so the skeletons
 * stay one visual language: ten hand-rolled copies drift apart the first time
 * anyone adjusts a radius. The shapes deliberately mirror the real layouts —
 * a skeleton whose blocks land somewhere other than the content causes a
 * visible jump on hydration, which is worse than no skeleton.
 */

/** Page title + subtitle, optionally with a primary action on the right. */
export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      {action && <Skeleton className="h-10 w-40" />}
    </div>
  );
}

/** A bordered card block of the given height. */
export function CardSkeleton({ className = "h-24" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-lg ${className}`} />;
}

/** The three-across week-over-week metric row. */
export function MetricRowSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stacked rows inside one card — activity feeds, member lists, session lists. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Responsive card grid — communities, courses, library resources, members. */
export function CardGridSkeleton({
  cards = 6,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  cards?: number;
  columns?: string;
}) {
  return (
    <div className={`grid gap-3 ${columns}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 flex-shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

/** Post cards, as rendered by the community feed. */
export function PostListSkeleton({ posts = 3 }: { posts?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: posts }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The wrapper every community sub-tab suspends inside. The community header is
 * rendered by the layout above and stays put across tab changes, so the
 * skeleton only stands in for the tab body.
 */
export function CommunityTabSkeleton({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>;
}

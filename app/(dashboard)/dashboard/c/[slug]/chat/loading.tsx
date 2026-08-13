import { Skeleton } from "@/components/ui/skeleton";
import { CommunityTabSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunityChatLoading() {
  return (
    <CommunityTabSkeleton>
      <div className="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden space-y-2 md:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </aside>
        <div className="flex h-[32rem] flex-col justify-end gap-4 rounded-lg border border-border bg-card p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className={i % 2 === 0 ? "h-4 w-3/4" : "h-4 w-1/2"} />
              </div>
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </CommunityTabSkeleton>
  );
}

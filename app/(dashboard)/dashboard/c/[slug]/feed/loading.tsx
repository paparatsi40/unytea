import { Skeleton } from "@/components/ui/skeleton";
import { CommunityTabSkeleton, PostListSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunityFeedLoading() {
  return (
    <CommunityTabSkeleton>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <PostListSkeleton posts={4} />
        </div>
        <aside className="hidden space-y-4 lg:block">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </aside>
      </div>
    </CommunityTabSkeleton>
  );
}

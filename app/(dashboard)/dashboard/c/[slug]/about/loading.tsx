import { Skeleton } from "@/components/ui/skeleton";
import { CommunityTabSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunityAboutLoading() {
  return (
    <CommunityTabSkeleton>
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </CommunityTabSkeleton>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { CommunityTabSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunitySettingsLoading() {
  return (
    <CommunityTabSkeleton>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </CommunityTabSkeleton>
  );
}

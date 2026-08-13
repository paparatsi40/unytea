import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton, CommunityTabSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunityMembersLoading() {
  return (
    <CommunityTabSkeleton>
      <Skeleton className="mb-4 h-10 w-full max-w-sm rounded-lg" />
      <CardGridSkeleton cards={9} columns="sm:grid-cols-2 lg:grid-cols-3" />
    </CommunityTabSkeleton>
  );
}

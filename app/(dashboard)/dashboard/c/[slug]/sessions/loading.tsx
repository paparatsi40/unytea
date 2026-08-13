import { CardGridSkeleton, CommunityTabSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunitySessionsLoading() {
  return (
    <CommunityTabSkeleton>
      <CardGridSkeleton cards={4} columns="sm:grid-cols-2" />
    </CommunityTabSkeleton>
  );
}

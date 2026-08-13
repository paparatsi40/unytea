import { CardGridSkeleton, CommunityTabSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunityBuddyLoading() {
  return (
    <CommunityTabSkeleton>
      <CardGridSkeleton cards={4} columns="sm:grid-cols-2" />
    </CommunityTabSkeleton>
  );
}

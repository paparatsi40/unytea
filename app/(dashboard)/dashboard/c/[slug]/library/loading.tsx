import { CardGridSkeleton, CommunityTabSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunityLibraryLoading() {
  return (
    <CommunityTabSkeleton>
      <CardGridSkeleton cards={6} />
    </CommunityTabSkeleton>
  );
}

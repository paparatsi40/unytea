import { CommunityTabSkeleton, PostListSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function CommunityLoading() {
  return (
    <CommunityTabSkeleton>
      <PostListSkeleton />
    </CommunityTabSkeleton>
  );
}

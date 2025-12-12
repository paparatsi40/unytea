import { redirect } from "next/navigation";

export default function CommunityPage({
  params,
}: {
  params: { communityId: string };
}) {
  // Redirect to feed by default
  redirect(`/dashboard/communities/${params.communityId}/feed`);
}

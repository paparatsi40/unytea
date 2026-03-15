"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PremiumPostFeed } from "@/components/community/PremiumPostFeed";
import { Users, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  getCommunityUpcomingSession,
  getCommunityHotDiscussions,
} from "@/app/actions/community-feed";

type Post = {
  id: string;
  title: string | null;
  content: string;
  contentType?: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  attachments?: {
    sessionId?: string;
    sessionTitle?: string;
    sessionDescription?: string;
    scheduledAt?: string;
    duration?: number;
    mentorId?: string;
    mentorName?: string;
    mentorImage?: string | null;
  } | null;
  _count?: {
    comments: number;
    reactions: number;
  };
};

type UpcomingSession = {
  id: string;
  title: string;
  slug: string | null;
  scheduledAt: Date;
  duration: number;
  mode: string;
  mentorName: string | null;
  mentorImage: string | null;
  attendeeCount: number;
};

type HotTopic = {
  id: string;
  title: string;
  commentCount: number;
  authorName: string | null;
};

export function CommunityFeedClient({
  slug,
}: {
  slug: string;
}) {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [communityId, setCommunityId] = useState<string>("");
  const [membership, setMembership] = useState<{
    isMember: boolean;
    isPending: boolean;
    isPrivate: boolean;
  } | null>(null);
  const [upcomingSession, setUpcomingSession] = useState<UpcomingSession | null>(null);
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (isLoading) return;

      if (!user) {
        router.push("/sign-in");
        return;
      }

      try {
        // Fetch community and membership data
        const communityResponse = await fetch(
          `/api/communities/${slug}?userId=${user.id}`
        );

        if (!communityResponse.ok) {
          if (communityResponse.status === 404) {
            router.push("/dashboard");
            return;
          }
          throw new Error("Failed to fetch community");
        }

        const communityData = await communityResponse.json();
        const { community, membership: membershipData } = communityData;

        console.log("✅ Community loaded:", community.id, community.name);
        setCommunityId(community.id);

        const isMember = membershipData?.status === "ACTIVE";
        const isPending = membershipData?.status === "PENDING";
        const isPrivate = community.isPrivate;

        setMembership({ isMember, isPending, isPrivate });

        // Fetch posts if member or public community
        if (isMember || !isPrivate) {
          const [postsResponse, sessionRes, topicsRes] = await Promise.all([
            fetch(`/api/communities/${slug}/posts?userId=${user.id}`),
            getCommunityUpcomingSession(community.id),
            getCommunityHotDiscussions(community.id, 5),
          ]);

          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            setPosts(postsData);
          }

          if (sessionRes.success) {
            setUpcomingSession(sessionRes.session);
          }

          if (topicsRes.success) {
            setHotTopics(topicsRes.topics || []);
          }
        }
      } catch (err) {
        console.error("❌ Error fetching community data:", err);
        setError(err instanceof Error ? err.message : "Failed to load community");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isLoading, router, slug]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error || !membership) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Error loading community</h2>
          <p className="mt-2 text-muted-foreground">{error || "Community not found"}</p>
        </div>
      </div>
    );
  }

  const { isMember, isPending, isPrivate } = membership;

  return (
    <div className="container mx-auto px-6 py-12">
      {isMember || !isPrivate ? (
        <PremiumPostFeed 
          posts={posts} 
          communityId={communityId}
          upcomingSession={upcomingSession}
          hotTopics={hotTopics}
        />
      ) : isPending ? (
        /* Pending Approval State */
        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-dashed border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10 p-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Users className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            Request Pending
          </h2>
          <p className="text-muted-foreground">
            Your request to join this community is awaiting approval from the
            community owner.
          </p>
        </div>
      ) : (
        /* Private Community - Not Member */
        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-card/50 to-accent/20 p-12 text-center backdrop-blur-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            Private Community
          </h2>
          <p className="mb-6 text-muted-foreground">
            This is a private community. Join to see posts and participate in
            discussions.
          </p>
        </div>
      )}
    </div>
  );
}

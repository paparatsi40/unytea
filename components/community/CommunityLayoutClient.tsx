"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Hash, Loader2 } from "lucide-react";
import { PremiumCommunityHeader } from "@/components/community/PremiumCommunityHeader";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AIChatWidget } from "@/components/ai/AIChatWidget";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  isPrivate: boolean;
  _count: {
    members: number;
    posts: number;
  };
};

type Membership = {
  role: string;
  status: string;
} | null;

export function CommunityLayoutClient({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<Membership>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommunity() {
      if (isLoading) return;

      if (!user) {
        router.push("/sign-in");
        return;
      }

      try {
        const response = await fetch(`/api/communities/${slug}?userId=${user.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            router.push("/dashboard");
            return;
          }
          throw new Error("Failed to fetch community");
        }

        const data = await response.json();
        setCommunity(data.community);
        setMembership(data.membership);
      } catch (err) {
        console.error("❌ Error fetching community:", err);
        setError(err instanceof Error ? err.message : "Failed to load community");
      } finally {
        setLoading(false);
      }
    }

    fetchCommunity();
  }, [user, isLoading, router, slug]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-sm font-medium text-gray-600">Loading community...</p>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Error loading community</h2>
          <p className="mt-2 text-sm text-gray-600">{error || "Community not found"}</p>
        </div>
      </div>
    );
  }

  const isMember = membership?.status === "ACTIVE";
  const isOwner = membership?.role === "OWNER";
  const isPending = membership?.status === "PENDING";

  return (
    <>
      <PremiumCommunityHeader
        community={community}
        isMember={isMember}
        isOwner={isOwner}
        isPending={isPending}
      />
      
      {/* Main Content */}
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>

      {/* AI Assistant with community context */}
      {isMember && <AIChatWidget communitySlug={slug} />}
    </>
  );
}

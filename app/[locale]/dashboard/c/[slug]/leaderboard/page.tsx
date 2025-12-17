"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Leaderboard } from "@/components/gamification/Leaderboard";
import { PointsGuide } from "@/components/gamification/PointsGuide";
import { Loader2 } from "lucide-react";

export default function LeaderboardPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const [communityId, setCommunityId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCommunity();
  }, [slug]);

  const loadCommunity = async () => {
    try {
      const response = await fetch(`/api/communities/${slug}`);
      const data = await response.json();
      
      if (data.id) {
        setCommunityId(data.id);
      }
    } catch (error) {
      console.error("Error loading community:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!communityId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Community not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard & Points</h1>
        <p className="mt-2 text-gray-600">
          Earn points, level up, and compete with other members
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Leaderboard communityId={communityId} />
        </div>
        <div>
          <PointsGuide />
        </div>
      </div>
    </div>
  );
}

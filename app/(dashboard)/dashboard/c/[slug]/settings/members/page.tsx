"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MemberDirectory } from "@/components/members/MemberDirectory";
import { Loader2 } from "lucide-react";

export default function CommunitySettingsMembers() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const [communityId, setCommunityId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCommunity = async () => {
      try {
        const response = await fetch(`/api/communities/${slug}`);
        const data = await response.json();
        if (data?.id) {
          setCommunityId(data.id);
        }
      } catch (error) {
        console.error("Error loading community:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCommunity();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!communityId) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-600">Community not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Members</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage roles, approve requests, and remove members.
        </p>
      </div>
      <MemberDirectory communityId={communityId} />
    </div>
  );
}

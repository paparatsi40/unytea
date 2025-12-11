"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MemberDirectory } from "@/components/members/MemberDirectory";
import { Loader2 } from "lucide-react";

export default function CommunityMembers() {
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

  return <MemberDirectory communityId={communityId} />;
}

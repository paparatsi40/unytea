"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";
import { joinCommunity, leaveCommunity } from "@/app/actions/communities";
import { Button } from "@/components/ui/button";
import { Settings, UserPlus, UserMinus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface CommunityActionsProps {
  communityId: string;
  communitySlug: string;
  isMember: boolean;
  isOwner: boolean;
  isPending: boolean;
}

export function CommunityActions({
  communityId,
  communitySlug,
  isMember,
  isOwner,
  isPending,
}: CommunityActionsProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (!user?.id) {
      toast.error("You must be signed in to join");
      return;
    }

    setIsLoading(true);

    try {
      const result = await joinCommunity(communityId);

      if (result.success) {
        toast.success(result.message || "Successfully joined!");
        router.refresh();
      }
    } catch (error) {
      console.error("Error joining community:", error);
      toast.error(error instanceof Error ? error.message : "Failed to join community");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user?.id) {
      toast.error("You must be signed in");
      return;
    }

    const confirmed = confirm(
      "Are you sure you want to leave this community? You'll need to request to join again."
    );

    if (!confirmed) return;

    setIsLoading(true);

    try {
      const result = await leaveCommunity(user.id, communityId);

      if (result.success) {
        toast.success(result.message || "Successfully left community");
        router.push("/dashboard/communities");
      }
    } catch (error) {
      console.error("Error leaving community:", error);
      toast.error(error instanceof Error ? error.message : "Failed to leave community");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {isPending ? (
        <Button
          disabled
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Pending Approval</span>
        </Button>
      ) : isMember ? (
        <>
          {!isOwner && (
            <Button
              onClick={handleLeave}
              disabled={isLoading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4" />
              )}
              <span>Leave</span>
            </Button>
          )}
          {isOwner && (
            <Link href={`/dashboard/communities/${communitySlug}/settings`}>
              <Button variant="outline" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
            </Link>
          )}
        </>
      ) : (
        <Button
          onClick={handleJoin}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          <span>Join Community</span>
        </Button>
      )}
    </div>
  );
}

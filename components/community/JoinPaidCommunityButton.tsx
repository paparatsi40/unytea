"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { joinPaidCommunity } from "@/app/actions/community-payments";

interface JoinPaidCommunityButtonProps {
  communityId: string;
  communityName: string;
  isPaid: boolean;
  price: number | null; // in cents
  isMember: boolean;
  onJoinFree?: () => Promise<void>;
}

export function JoinPaidCommunityButton({
  communityId,
  communityName,
  isPaid,
  price,
  isMember,
  onJoinFree,
}: JoinPaidCommunityButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleJoinPaid() {
    setLoading(true);
    try {
      const result = await joinPaidCommunity(communityId);

      if (result.success && result.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl;
      } else {
        toast.error(result.error || "Failed to start checkout");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinFree() {
    if (onJoinFree) {
      setLoading(true);
      try {
        await onJoinFree();
      } catch (error) {
        toast.error("Failed to join community");
      } finally {
        setLoading(false);
      }
    }
  }

  // Already a member
  if (isMember) {
    return (
      <Button disabled variant="outline" className="gap-2">
        <Sparkles className="h-4 w-4" />
        Already a Member
      </Button>
    );
  }

  // Free community
  if (!isPaid) {
    return (
      <Button
        onClick={handleJoinFree}
        disabled={loading}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            Join Community
          </>
        )}
      </Button>
    );
  }

  // Paid community
  const priceInDollars = price ? (price / 100).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleJoinPaid}
        disabled={loading}
        size="lg"
        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading Checkout...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Join for ${priceInDollars}/month
          </>
        )}
      </Button>
      
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <DollarSign className="h-3 w-3" />
        <span>Secure payment via Stripe</span>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function JoinPaidCommunityBadge({
  isPaid,
  price,
}: {
  isPaid: boolean;
  price: number | null;
}) {
  if (!isPaid) {
    return (
      <Badge variant="secondary" className="gap-1">
        Free
      </Badge>
    );
  }

  const priceInDollars = price ? (price / 100).toFixed(2) : "0.00";

  return (
    <Badge variant="default" className="gap-1 bg-green-600">
      <DollarSign className="h-3 w-3" />
      ${priceInDollars}/mo
    </Badge>
  );
}
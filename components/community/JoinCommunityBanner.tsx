"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface JoinCommunityBannerProps {
  communitySlug: string;
  communityName: string;
  isPaid: boolean;
  membershipPrice?: number | null;
  requireApproval: boolean;
  locale: string;
}

export function JoinCommunityBanner({
  communitySlug,
  communityName,
  isPaid,
  membershipPrice,
  requireApproval,
  locale,
}: JoinCommunityBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Show success/error toasts based on URL params
  const paymentStatus = searchParams.get("payment");
  if (paymentStatus === "success") {
    toast.success("Payment successful!", {
      description: `Welcome to ${communityName}! You now have full access.`,
    });
    // Clear the URL param
    router.replace(`/${locale}/dashboard/communities/${communitySlug}`);
  } else if (paymentStatus === "cancelled") {
    toast.info("Payment cancelled", {
      description: "You can try again whenever you're ready.",
    });
    // Clear the URL param
    router.replace(`/${locale}/dashboard/communities/${communitySlug}`);
  }

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      if (isPaid) {
        // Redirect to Stripe checkout
        const response = await fetch(
          `/api/communities/${communitySlug}/checkout?locale=${locale}`,
          {
            method: "POST",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to start checkout");
        }

        // Redirect to Stripe
        window.location.href = data.checkoutUrl;
      } else {
        // Free or approval-based join
        const response = await fetch(`/api/communities/${communitySlug}/join`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to join community");
        }

        if (requireApproval) {
          toast.success("Join request sent!", {
            description: "The community owner will review your request.",
          });
        } else {
          toast.success("Successfully joined community!", {
            description: `Welcome to ${communityName}!`,
          });
        }

        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join community"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            You're not a member yet
          </h3>
          <p className="text-muted-foreground">
            {isPaid && membershipPrice
              ? `Join this community for $${membershipPrice}/month to access all content`
              : requireApproval
              ? "Request to join this community to access all content"
              : "Join this community to participate and access all features"}
          </p>
        </div>

        <Button
          onClick={handleJoin}
          disabled={isLoading}
          size="lg"
          className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {isPaid ? "Redirecting..." : "Joining..."}
            </>
          ) : (
            <>
              {isPaid ? (
                <CreditCard className="mr-2 h-5 w-5" />
              ) : (
                <UserPlus className="mr-2 h-5 w-5" />
              )}
              {isPaid
                ? `Join for $${membershipPrice}/mo`
                : requireApproval
                ? "Request to Join"
                : "Join Community"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
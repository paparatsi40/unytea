"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinCommunity } from "@/app/actions/communities";

/**
 * The only thing on the join page that writes.
 *
 * The page it sits on used to perform the membership write during its own
 * server render, which meant a GET — including Next's link prefetch — mutated
 * the database. Joining is a user's decision, so it happens on their click and
 * nowhere else.
 *
 * It calls the existing `joinCommunity` action rather than re-implementing the
 * rules. That action already owns the paid-community gate, the owner's
 * member-limit gate, the approval flow, rate limiting and the identity check —
 * a second implementation here is how those gates drift apart, which is exactly
 * what the raw page did by bypassing it.
 */
export function JoinCommunityButton({
  communityId,
  communitySlug,
}: {
  communityId: string;
  communitySlug: string;
}) {
  const t = useTranslations("community.join");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "joined" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function messageForCode(code: unknown, fallback: string): string {
    switch (code) {
      case "PAYMENT_REQUIRED":
        return t("errorPaymentRequired");
      case "PLAN_LIMIT_MEMBERS":
        return t("errorFull");
      case "ALREADY_MEMBER":
        return t("errorAlreadyMember");
      default:
        return fallback;
    }
  }

  async function handleJoin() {
    setStatus("idle");
    setMessage(null);

    const result = await joinCommunity(communityId);

    if (result.success) {
      setStatus("joined");
      // PENDING memberships land on the community page too; it renders the
      // waiting state from the membership row rather than from a flag here.
      router.push(`/dashboard/c/${communitySlug}`);
      router.refresh();
      return;
    }

    // Already a member — including the concurrent-join race the action now
    // absorbs — is not a failure from the user's point of view. They wanted to
    // be in the community and they are; send them in.
    if ("code" in result && result.code === "ALREADY_MEMBER") {
      setStatus("joined");
      router.push(`/dashboard/c/${communitySlug}`);
      router.refresh();
      return;
    }

    setStatus("error");
    setMessage(messageForCode("code" in result ? result.code : undefined, t("errorGeneric")));
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={isPending || status === "joined"}
        onClick={() => startTransition(handleJoin)}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t("joining")}
          </>
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("joinCta")}
          </>
        )}
      </Button>

      {status === "joined" && (
        <p className="text-sm text-muted-foreground" role="status">
          {t("joined")}
        </p>
      )}

      {status === "error" && message && (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

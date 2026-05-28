"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublicSessionData } from "@/app/actions/public-sessions";

interface Props {
  session: PublicSessionData;
}

export function JoinSessionCTA({ session }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);

  const isLive = session.status === "IN_PROGRESS";
  const isUpcoming = session.status === "SCHEDULED";

  const handleJoin = () => {
    // Check if user is logged in
    // In production, this would check auth state
    const isLoggedIn = false; // Placeholder

    if (isLoggedIn) {
      router.push(`/dashboard/sessions/${session.id}/room`);
    } else {
      setShowDialog(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleJoin}
        className={`${
          isLive ? "animate-pulse bg-red-500 hover:bg-red-600" : "bg-violet-600 hover:bg-violet-700"
        } text-white`}
      >
        {isLive ? (
          <>
            <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-white" />
            Join Live
          </>
        ) : isUpcoming ? (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            RSVP Free
          </>
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Watch Replay
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isLive
                ? "🔴 Session is Live!"
                : isUpcoming
                  ? "Reserve Your Spot"
                  : "Watch the Replay"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isLive
                ? "Join now to participate in the live discussion."
                : isUpcoming
                  ? "Sign up to get notified and add this to your calendar."
                  : "Create an account to access the full recording and resources."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Session preview */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="font-semibold text-gray-900">{session.title}</h4>
              <p className="mt-1 text-sm text-gray-500">with {session.host.name || "our expert"}</p>
              {session.community && (
                <p className="mt-1 text-sm text-violet-600">in {session.community.name}</p>
              )}
            </div>

            {/* Value props */}
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-600">
                  ✓
                </span>
                Free to join - no credit card required
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-600">
                  ✓
                </span>
                Access full transcript & resources
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-600">
                  ✓
                </span>
                Join {session.attendeeCount} others learning together
              </li>
            </ul>

            {/* CTA buttons */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full bg-violet-600 text-white hover:bg-violet-700"
                onClick={() =>
                  router.push(
                    `/signup?redirect=/dashboard/sessions/${session.id}${isLive ? "/room" : ""}`
                  )
                }
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Free Account
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  router.push(
                    `/signin?redirect=/dashboard/sessions/${session.id}${isLive ? "/room" : ""}`
                  )
                }
              >
                <LogIn className="mr-2 h-4 w-4" />
                Already have an account? Sign in
              </Button>
            </div>

            <p className="text-center text-xs text-gray-500">
              By joining, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

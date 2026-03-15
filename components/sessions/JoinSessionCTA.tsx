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
          isLive
            ? "bg-red-500 hover:bg-red-600 animate-pulse"
            : "bg-violet-600 hover:bg-violet-700"
        } text-white`}
      >
        {isLive ? (
          <>
            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            Join Live
          </>
        ) : isUpcoming ? (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            RSVP Free
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4 mr-2" />
            Watch Replay
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isLive ? "🔴 Session is Live!" : isUpcoming ? "Reserve Your Spot" : "Watch the Replay"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isLive
                ? "Join now to participate in the live discussion."
                : isUpcoming
                  ? "Sign up to get notified and add this to your calendar."
                  : "Create an account to access the full recording and resources."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Session preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900">{session.title}</h4>
              <p className="text-sm text-gray-500 mt-1">
                with {session.host.name || "our expert"}
              </p>
              {session.community && (
                <p className="text-sm text-violet-600 mt-1">
                  in {session.community.name}
                </p>
              )}
            </div>

            {/* Value props */}
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                  ✓
                </span>
                Free to join - no credit card required
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                  ✓
                </span>
                Access full transcript & resources
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                  ✓
                </span>
                Join {session.attendeeCount} others learning together
              </li>
            </ul>

            {/* CTA buttons */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() =>
                  router.push(
                    `/signup?redirect=/dashboard/sessions/${session.id}${isLive ? "/room" : ""}`
                  )
                }
              >
                <UserPlus className="w-4 h-4 mr-2" />
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
                <LogIn className="w-4 h-4 mr-2" />
                Already have an account? Sign in
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              By joining, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

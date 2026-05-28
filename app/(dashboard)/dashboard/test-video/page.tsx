"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EnhancedVideoCall } from "@/components/video-call/EnhancedVideoCall";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TestVideoPage() {
  const router = useRouter();
  const [inCall, setInCall] = useState(false);
  const [roomName, setRoomName] = useState("test-room");
  const [userName, setUserName] = useState("Test User");
  const [userId] = useState("test-user-id");
  const [isModerator, setIsModerator] = useState(true);

  if (!inCall) {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              🎥 Test Enhanced Video Call
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Test all Phase 1 features: Reactions, Chat, and Polls
            </p>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="test-room"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use the same room name in multiple tabs to test multi-user features
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Test User"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="moderator"
                checked={isModerator}
                onChange={(e) => setIsModerator(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="moderator" className="text-sm text-gray-700 dark:text-gray-300">
                Join as Moderator (can create polls, pin messages)
              </label>
            </div>
          </div>

          <Button
            onClick={() => setInCall(true)}
            disabled={!roomName || !userName}
            className="w-full"
            size="lg"
          >
            Join Test Video Call
          </Button>

          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
              📝 Features to Test:
            </h3>
            <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
              <li>
                • <strong>Reactions:</strong> Click emoji button (bottom-right) and see floating
                animations
              </li>
              <li>
                • <strong>Chat:</strong> Click chat button (bottom-left) and try Q&A mode
              </li>
              <li>
                • <strong>Polls:</strong> As moderator, create a poll and vote on it
              </li>
              <li>
                • <strong>Multi-user:</strong> Open in another tab/window with same room name
              </li>
            </ul>
          </div>

          <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
            <h3 className="mb-2 text-sm font-semibold text-purple-900 dark:text-purple-100">
              💡 Testing Tips:
            </h3>
            <ul className="space-y-1 text-xs text-purple-700 dark:text-purple-300">
              <li>• Open 2-3 browser windows/tabs for multi-user testing</li>
              <li>• Use different names in each window</li>
              <li>• Make one moderator, others as participants</li>
              <li>• Test reactions, chat, and polls between them</li>
              <li>• Check that everything syncs in real-time</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Test Video Call - {roomName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {userName} {isModerator && "(Moderator)"}
          </p>
        </div>
        <Button variant="outline" onClick={() => setInCall(false)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Leave Call
        </Button>
      </div>

      {/* Enhanced Video Call */}
      <div className="flex-1 p-6">
        <EnhancedVideoCall
          roomName={roomName}
          participantName={userName}
          userId={userId + Math.random()} // Unique per window
          onDisconnect={() => setInCall(false)}
          isModerator={isModerator}
        />
      </div>

      {/* Info Banner */}
      <div className="px-6 pb-6">
        <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex gap-3">
            <div className="text-2xl">🎮</div>
            <div>
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                All Phase 1 Features Active!
              </h3>
              <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                Try: Reactions (bottom-right), Chat (bottom-left), and Polls (moderator only,
                bottom-left)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

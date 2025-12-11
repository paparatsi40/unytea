"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EnhancedVideoCall } from "@/components/video-call/EnhancedVideoCall";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TestVideoPage() {
  const router = useRouter();
  const [inCall, setInCall] = useState(false);
  const [roomName, setRoomName] = useState("test-room");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isModerator, setIsModerator] = useState(true);

  // Generate unique user ID per tab that persists
  useEffect(() => {
    // Check if we have a userId in sessionStorage (persists per tab)
    let storedUserId = sessionStorage.getItem("test-video-user-id");
    
    if (!storedUserId) {
      // Generate new unique ID
      storedUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("test-video-user-id", storedUserId);
    }
    
    setUserId(storedUserId);
    
    // Set default name based on userId
    const userNumber = storedUserId.split("-")[1] || "1";
    setUserName(`User ${userNumber.slice(-4)}`);
  }, []);

  if (!userId) {
    // Wait until userId is generated
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!inCall) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🎥 Test Enhanced Video Call
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Test all Phase 1 features: Reactions, Chat, and Polls
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="test-room"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use the same room name in multiple tabs to test multi-user features
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Test User"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="moderator"
                checked={isModerator}
                onChange={(e) => setIsModerator(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
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

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📝 Features to Test:
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Reactions:</strong> Click emoji button (bottom-right) and see floating animations</li>
              <li>• <strong>Chat:</strong> Click chat button (bottom-left) and try Q&A mode</li>
              <li>• <strong>Polls:</strong> As moderator, create a poll and vote on it</li>
              <li>• <strong>Multi-user:</strong> Open in another tab/window with same room name</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
              💡 Testing Tips:
            </h3>
            <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
          participantName={`${userName}-${userId.slice(-6)}`} // Make participantName unique
          userId={userId}
          onDisconnect={() => setInCall(false)}
          isModerator={isModerator}
        />
      </div>

      {/* Info Banner */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex gap-3">
            <div className="text-2xl">🎮</div>
            <div>
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                All Phase 1 Features Active!
              </h3>
              <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                Try: Reactions (bottom-right), Chat (bottom-left), and Polls (moderator only, bottom-left)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

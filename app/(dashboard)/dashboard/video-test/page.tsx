"use client";

import { useState } from "react";
import { VideoCallRoom } from "@/components/video-call/VideoCallRoom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Video } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VideoTestPage() {
  const router = useRouter();
  const [inCall, setInCall] = useState(false);
  const [roomName, setRoomName] = useState("test-room");
  const [participantName, setParticipantName] = useState("Test User");

  function handleJoinCall() {
    if (!roomName.trim() || !participantName.trim()) {
      alert("Please enter both room name and your name");
      return;
    }
    setInCall(true);
  }

  function handleLeaveCall() {
    setInCall(false);
  }

  if (inCall) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Video Call Test</h1>
            <p className="mt-2 text-muted-foreground">
              Room: <span className="font-semibold">{roomName}</span>
            </p>
          </div>
          <Button variant="outline" onClick={handleLeaveCall}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Leave Call
          </Button>
        </div>

        {/* Video Call */}
        <VideoCallRoom
          roomName={roomName}
          participantName={participantName}
          onDisconnect={handleLeaveCall}
        />

        {/* Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">How to test:</h3>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                <li>• Open this page in another browser/tab to simulate another participant</li>
                <li>• Use the same room name to join the same call</li>
                <li>• You should see both video streams</li>
                <li>• Test mute, camera on/off, and screen share controls</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Video Call Test</h1>
          <p className="mt-2 text-muted-foreground">
            Test LiveKit video calls integration
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Form */}
      <div className="rounded-lg border bg-white p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <Video className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Join Video Call</h2>
            <p className="text-sm text-muted-foreground">
              Enter room details to start testing
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="test-room"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use the same room name to join with multiple participants
            </p>
          </div>

          <div>
            <Label htmlFor="participantName">Your Name</Label>
            <Input
              id="participantName"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="John Doe"
              className="mt-1.5"
            />
          </div>

          <Button
            onClick={handleJoinCall}
            className="w-full"
            size="lg"
          >
            <Video className="mr-2 h-5 w-5" />
            Join Call
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="text-sm font-semibold text-yellow-900">Setup Required</h3>
            <div className="mt-2 space-y-2 text-xs text-yellow-700">
              <p>Before testing, make sure you have:</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Created a LiveKit Cloud account at <code className="rounded bg-yellow-100 px-1 py-0.5">https://cloud.livekit.io/</code></li>
                <li>Added credentials to <code className="rounded bg-yellow-100 px-1 py-0.5">.env.local</code>:
                  <ul className="ml-4 mt-1 list-disc">
                    <li><code>LIVEKIT_URL</code></li>
                    <li><code>LIVEKIT_API_KEY</code></li>
                    <li><code>LIVEKIT_API_SECRET</code></li>
                  </ul>
                </li>
                <li>Restarted the development server</li>
              </ol>
              <p className="mt-2">
                See <code className="rounded bg-yellow-100 px-1 py-0.5">web/LIVEKIT_SETUP.md</code> for detailed instructions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

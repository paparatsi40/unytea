"use client";

import { useState, useRef } from "react";

export default function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const startCamera = async () => {
    try {
      addLog("🎥 Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });
      addLog("✅ Camera access granted!");

      const videoTrack = mediaStream.getVideoTracks()[0];
      const audioTrack = mediaStream.getAudioTracks()[0];

      addLog(`📹 Video: ${videoTrack.label}`);
      addLog(`🎤 Audio: ${audioTrack.label}`);
      addLog(`📐 Resolution: ${videoTrack.getSettings().width}x${videoTrack.getSettings().height}`);

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError("");
    } catch (err) {
      const errorMsg = (err as Error).message;
      addLog(`❌ Error: ${errorMsg}`);
      setError(errorMsg);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => {
      track.stop();
      addLog(`⏹️ Stopped: ${track.kind}`);
    });
    setStream(null);
  };

  const toggleVideo = () => {
    const videoTrack = stream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      addLog(`📹 Video ${videoTrack.enabled ? "enabled" : "disabled"}`);
    }
  };

  const toggleAudio = () => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      addLog(`🎤 Audio ${audioTrack.enabled ? "enabled" : "disabled"}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-4xl font-bold">🎥 Camera Test</h1>
        <p className="mb-8 text-gray-300">Test your camera and microphone settings</p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-500/20 p-4 text-red-200">
            <strong className="text-red-300">Error:</strong> {error}
            <p className="mt-2 text-sm">
              Make sure you&apos;ve granted camera permissions. Look for the 🔒 icon in your browser
              address bar.
            </p>
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={startCamera}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold shadow-lg transition hover:bg-green-500"
          >
            ▶️ Start Camera
          </button>
          <button
            onClick={stopCamera}
            className="rounded-lg bg-red-600 px-6 py-3 font-semibold shadow-lg transition hover:bg-red-500"
          >
            ⏹️ Stop Camera
          </button>
          <button
            onClick={toggleVideo}
            disabled={!stream}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            📹 Toggle Video
          </button>
          <button
            onClick={toggleAudio}
            disabled={!stream}
            className="rounded-lg bg-yellow-600 px-6 py-3 font-semibold shadow-lg transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            🎤 Toggle Audio
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Video Preview */}
          <div className="overflow-hidden rounded-xl border border-white/20 bg-black/50 shadow-2xl">
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="mb-4 text-6xl">🎥</div>
                    <p>Camera is off</p>
                    <p className="mt-2 text-sm">Click &quot;Start Camera&quot; to begin</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between bg-black/60 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${stream ? "animate-pulse bg-green-500" : "bg-red-500"}`}
                />
                <span className="font-medium">{stream ? "🟢 Camera Active" : "🔴 Camera Off"}</span>
              </div>
              {stream && (
                <div className="text-sm text-gray-400">
                  {stream.getVideoTracks()[0]?.enabled ? "📹 On" : "📹 Off"} |
                  {stream.getAudioTracks()[0]?.enabled ? " 🎤 On" : " 🎤 Off"}
                </div>
              )}
            </div>
          </div>

          {/* Logs Panel */}
          <div className="flex h-[500px] flex-col rounded-xl border border-white/20 bg-black/30 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              📋 Activity Log
              <button
                onClick={() => setLogs([])}
                className="ml-auto rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
              >
                Clear
              </button>
            </h3>
            <div className="flex-1 space-y-2 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="italic text-gray-500">
                  No activity yet. Start the camera to see logs...
                </p>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`rounded p-2 ${
                      log.includes("❌")
                        ? "bg-red-500/20 text-red-200"
                        : log.includes("✅")
                          ? "bg-green-500/20 text-green-200"
                          : "bg-white/5 text-gray-300"
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="mb-4 font-semibold">📝 Instructions:</h3>
          <ol className="list-inside list-decimal space-y-2 text-gray-300">
            <li>
              Click <strong>&quot;Start Camera&quot;</strong> to enable your camera and microphone
            </li>
            <li>
              Allow browser permissions when prompted (look for the 🔒 icon in the address bar)
            </li>
            <li>
              Use <strong>&quot;Toggle Video&quot;</strong> to turn video on/off during a call
            </li>
            <li>
              Use <strong>&quot;Toggle Audio&quot;</strong> to mute/unmute your microphone
            </li>
            <li>
              Click <strong>&quot;Stop Camera&quot;</strong> to completely turn off all tracks
            </li>
          </ol>

          <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <strong className="text-yellow-300">💡 Tip:</strong>
            <span className="text-gray-300">
              {" "}
              If camera doesn&apos;t work, check that no other app is using it (Zoom, Teams, etc.)
              and refresh the page.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

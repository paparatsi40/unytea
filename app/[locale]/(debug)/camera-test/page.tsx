"use client";

import { useState, useRef } from "react";

export default function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const startCamera = async () => {
    try {
      addLog("🎥 Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
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
    stream?.getTracks().forEach(track => {
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🎥 Camera Test</h1>
        <p className="text-gray-300 mb-8">Test your camera and microphone settings</p>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            <strong className="text-red-300">Error:</strong> {error}
            <p className="text-sm mt-2">
              Make sure you&apos;ve granted camera permissions. Look for the 🔒 icon in your browser address bar.
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-3 mb-8">
          <button 
            onClick={startCamera}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition shadow-lg"
          >
            ▶️ Start Camera
          </button>
          <button 
            onClick={stopCamera}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition shadow-lg"
          >
            ⏹️ Stop Camera
          </button>
          <button 
            onClick={toggleVideo}
            disabled={!stream}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition shadow-lg"
          >
            📹 Toggle Video
          </button>
          <button 
            onClick={toggleAudio}
            disabled={!stream}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition shadow-lg"
          >
            🎤 Toggle Audio
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Preview */}
          <div className="bg-black/50 rounded-xl overflow-hidden border border-white/20 shadow-2xl">
            <div className="relative aspect-video bg-black">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎥</div>
                    <p>Camera is off</p>
                    <p className="text-sm mt-2">Click &quot;Start Camera&quot; to begin</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-black/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${stream ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className="font-medium">
                  {stream ? "🟢 Camera Active" : "🔴 Camera Off"}
                </span>
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
          <div className="bg-black/30 rounded-xl p-6 border border-white/20 h-[500px] flex flex-col">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              📋 Activity Log
              <button 
                onClick={() => setLogs([])}
                className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded ml-auto"
              >
                Clear
              </button>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No activity yet. Start the camera to see logs...</p>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded ${
                      log.includes("❌") ? "bg-red-500/20 text-red-200" :
                      log.includes("✅") ? "bg-green-500/20 text-green-200" :
                      "bg-white/5 text-gray-300"
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
        <div className="mt-8 bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="font-semibold mb-4">📝 Instructions:</h3>
          <ol className="space-y-2 text-gray-300 list-decimal list-inside">
            <li>Click <strong>&quot;Start Camera&quot;</strong> to enable your camera and microphone</li>
            <li>Allow browser permissions when prompted (look for the 🔒 icon in the address bar)</li>
            <li>Use <strong>&quot;Toggle Video&quot;</strong> to turn video on/off during a call</li>
            <li>Use <strong>&quot;Toggle Audio&quot;</strong> to mute/unmute your microphone</li>
            <li>Click <strong>&quot;Stop Camera&quot;</strong> to completely turn off all tracks</li>
          </ol>
          
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <strong className="text-yellow-300">💡 Tip:</strong> 
            <span className="text-gray-300"> If camera doesn&apos;t work, check that no other app is using it (Zoom, Teams, etc.) and refresh the page.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

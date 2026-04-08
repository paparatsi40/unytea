"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-purple-500/10">
        <WifiOff className="h-12 w-12 text-purple-400" />
      </div>

      <h1 className="mb-3 text-3xl font-bold text-white">You&apos;re Offline</h1>

      <p className="mb-8 max-w-md text-lg text-zinc-400">
        It looks like you&apos;ve lost your internet connection. Check your
        connection and try again.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
      >
        <RefreshCw className="h-5 w-5" />
        Try Again
      </button>

      <div className="mt-12 text-sm text-zinc-600">
        <p>Some features may still be available offline.</p>
        <p className="mt-1">Your data will sync when you reconnect.</p>
      </div>
    </div>
  );
}

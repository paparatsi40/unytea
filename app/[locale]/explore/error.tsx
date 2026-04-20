"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Explore] Server error:", error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 p-6">
        <h2 className="text-2xl font-bold text-foreground">
          Something went wrong loading communities
        </h2>
        <p className="text-muted-foreground">
          Error: {error.message || "Unknown error"}
          {error.digest && <span className="block text-xs mt-1">Digest: {error.digest}</span>}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

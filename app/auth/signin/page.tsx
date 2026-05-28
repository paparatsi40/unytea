"use client";

import { Suspense } from "react";
import { SignInContent } from "./signin-content";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
                  <div className="h-6 w-6 animate-pulse rounded-full bg-white/30" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
                  Unytea
                </span>
              </div>
              <div className="mx-auto mb-2 h-8 w-48 animate-pulse rounded bg-gray-200" />
              <div className="mx-auto h-4 w-64 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
              <div className="space-y-4">
                <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
                <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}

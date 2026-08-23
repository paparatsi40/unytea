import { Suspense } from "react";

import { AuthErrorContent } from "./auth-error-content";

/**
 * `AuthErrorContent` reads `useSearchParams`, which is what the Suspense
 * boundary is for — the same shape `app/auth/signin/page.tsx` uses. The
 * fallback is the page's own frame with the message area blank, so the reader
 * never sees a flash of empty document while the error resolves.
 */
export default function AuthErrorPage() {
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
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
              <div className="mb-6 h-12 w-12 animate-pulse rounded-xl bg-amber-100" />
              <div className="mb-3 h-7 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="mt-8 space-y-3">
                <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
                <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}

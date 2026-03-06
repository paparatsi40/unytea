"use client"

import { Suspense } from "react"
import { SignInContent } from "./signin-content"

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <div className="w-6 h-6 bg-white/30 rounded-full animate-pulse" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Unytea
              </span>
            </div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mx-auto" />
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}

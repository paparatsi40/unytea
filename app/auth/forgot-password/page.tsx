"use client"

import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Mentorly
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600">
            Coming soon! For now, contact support.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔧</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Feature in Development
            </h2>
            <p className="text-gray-600 mb-4">
              Password reset functionality is coming soon. For now, please contact an administrator to reset your password.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-purple-800">
                <strong>Need help?</strong> Email us at support@mentorly.com
              </p>
            </div>
          </div>

          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

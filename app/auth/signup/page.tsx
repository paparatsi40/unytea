"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chrome, Github, Mail, Lock, User, ArrowRight, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    try {
      setIsLoading(true);
      // Add newUser flag for OAuth callback handling
      await signIn(provider, { callbackUrl: "/onboarding?newUser=true" });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      toast.error(t("auth.fillAllFields"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordsDoNotMatch"));
      return;
    }

    try {
      setIsLoading(true);

      // Call API to create user
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t("common.error"));
        return;
      }

      // Sign in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("auth.signInError"));
      } else {
        toast.success(t("auth.accountCreated"));
        // Redirect to onboarding with flag to prevent middleware interference
        router.push("/onboarding?newUser=true");
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = password.length >= 8;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
              Unytea
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600">Join the best community platform today ☕</p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          {/* OAuth Buttons */}
          <div className="mb-6 space-y-3">
            <button
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all hover:border-purple-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Chrome className="h-5 w-5 text-gray-700 transition-colors group-hover:text-purple-600" />
              <span className="font-medium text-gray-700">Continue with Google</span>
            </button>

            <button
              onClick={() => handleOAuthSignIn("github")}
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all hover:border-purple-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Github className="h-5 w-5 text-gray-700 transition-colors group-hover:text-purple-600" />
              <span className="font-medium text-gray-700">Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">or sign up with email</span>
            </div>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {passwordStrength ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Strong password</span>
                    </>
                  ) : (
                    <span className="text-amber-600">At least 8 characters required</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-medium text-white transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-purple-600 hover:text-purple-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                Privacy Policy
              </Link>
            </p>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-medium text-purple-600 hover:text-purple-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

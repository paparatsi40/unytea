"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import type { OAuthProviderId } from "@/lib/auth-providers";

interface SignInContentProps {
  /** Registered OAuth providers, resolved on the server in `page.tsx`. */
  oauthProviders: OAuthProviderId[];
}

export function SignInContent({ oauthProviders }: SignInContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";
  const t = useTranslations();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthSignIn = async (provider: OAuthProviderId) => {
    try {
      setIsLoading(true);
      await signIn(provider, { callbackUrl });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t("auth.fillAllFields"));
      return;
    }

    try {
      setIsLoading(true);
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("auth.invalidCredentials"));
      } else {
        toast.success(t("auth.welcomeBack"));
        router.push(callbackUrl);
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{t("auth.welcomeBack")}</h1>
          <p className="text-gray-600">{t("auth.signInSubtitle")}</p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          {/* OAuth buttons — only for providers the server actually registered */}
          <OAuthButtons
            providers={oauthProviders}
            dividerLabel={t("auth.orContinueWith")}
            disabled={isLoading}
            onSelect={handleOAuthSignIn}
          />

          {/* Email/Password Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                {t("auth.password")}
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
                  {t("auth.signIn")}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-gray-600">
            {t("auth.noAccount")}{" "}
            <Link href="/auth/signup" className="font-medium text-purple-600 hover:text-purple-700">
              {t("auth.signUp")}
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            <Link href="/auth/forgot-password" className="hover:text-gray-700">
              {t("auth.forgotPassword")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

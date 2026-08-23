"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, Sparkles, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { authErrorMessage } from "@/lib/auth-error-message";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import type { OAuthProviderId } from "@/lib/auth-providers";
import { isSignupConflictCode, type SignupConflictCode } from "@/lib/signup-conflict";

interface SignUpContentProps {
  /** Registered OAuth providers, resolved on the server in `page.tsx`. */
  oauthProviders: OAuthProviderId[];
}

export function SignUpContent({ oauthProviders }: SignUpContentProps) {
  const router = useRouter();
  const t = useTranslations();
  const tError = useTranslations("auth.errors");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  /**
   * Set when the address is already registered. Not a toast: this is a fork in
   * the road, and the other branch has to still be on screen when the reader
   * reaches for it.
   */
  const [conflict, setConflict] = useState<SignupConflictCode | null>(null);

  const handleOAuthSignIn = async (provider: OAuthProviderId) => {
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
    setConflict(null);

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
        // An address that is already taken is not a failure to flash and
        // dismiss. Show it in place, with the two doors that actually lead
        // somewhere, and do not go on to sign in — signing in with a password
        // that was never this account's is precisely how this used to end in a
        // bare "sign-in error" on a signup form.
        if (isSignupConflictCode(data.code)) {
          setConflict(data.code);
          return;
        }
        toast.error(authErrorMessage(tError, data.code));
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
        // Same as sign-in: the cookie is set, but the client Router Cache still
        // holds what the server said while there was no session. Discard it, or
        // the navigation below answers from the logged-out copy.
        router.refresh();
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
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{t("auth.signup.title")}</h1>
          <p className="text-gray-600">{t("auth.signup.subtitle")}</p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          {/* Above the OAuth buttons on purpose: when the notice says the
              account uses Google, the Google button is the next thing on the
              page rather than something to go hunting for. */}
          {conflict && (
            <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {t("auth.signupConflict.title")}
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    {t(`auth.signupConflict.${conflict}`)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Link
                      href={`/auth/signin?email=${encodeURIComponent(email)}`}
                      className="text-sm font-medium text-purple-700 underline underline-offset-2 hover:text-purple-900"
                    >
                      {t("auth.signupConflict.signInCta")}
                    </Link>
                    {/* Only where there is a password to recover. On an account
                        that has none, "forgot your password?" is a question
                        about something that never existed. */}
                    {(conflict === "EMAIL_IN_USE_PASSWORD" || conflict === "EMAIL_IN_USE") && (
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm font-medium text-purple-700 underline underline-offset-2 hover:text-purple-900"
                      >
                        {t("auth.signupConflict.forgotCta")}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OAuth buttons — only for providers the server actually registered */}
          <OAuthButtons
            providers={oauthProviders}
            dividerLabel={t("auth.signup.orWithEmail")}
            disabled={isLoading}
            onSelect={handleOAuthSignIn}
          />

          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                {t("auth.signup.fullName")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.signup.fullNamePlaceholder")}
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                {t("auth.signup.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // The notice names one address. Once it is being edited it
                    // is advice about somebody else's account.
                    setConflict(null);
                  }}
                  placeholder={t("auth.signup.emailPlaceholder")}
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                {t("auth.signup.password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.signup.passwordPlaceholder")}
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {passwordStrength ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">{t("auth.signup.passwordStrong")}</span>
                    </>
                  ) : (
                    <span className="text-amber-600">{t("auth.signup.passwordHint")}</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {t("auth.signup.confirmPassword")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("auth.signup.confirmPasswordPlaceholder")}
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
                  {t("auth.signup.submit")}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              {t.rich("auth.signup.legal", {
                terms: (chunks) => (
                  <Link href="/terms" className="text-purple-600 hover:text-purple-700">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t("auth.signup.haveAccount")}{" "}
            <Link href="/auth/signin" className="font-medium text-purple-600 hover:text-purple-700">
              {t("auth.signup.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, Home, Sparkles } from "lucide-react";

import { authPageErrorKey } from "@/lib/auth-error-page";

/**
 * What a failed sign-in looks like.
 *
 * This page did not exist. `lib/auth.ts` has always declared
 * `pages.error: "/auth/error"`, so every OAuth failure redirected here and met
 * Next's bare 404 — no logo, no navigation, no way back. The commonest way to
 * get here is also the most ordinary: pressing "Cancel" on Google's consent
 * screen raises `AccessDenied`, and the user was thrown off the product for it.
 *
 * So the two things this page owes the reader are an explanation and a door.
 * Both links are unconditional — whatever went wrong, and whether or not the
 * code is one we recognise, sign-in and the home page are always one click away.
 */
export function AuthErrorContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("auth.errorPage");
  // Never the raw parameter: it is written by whoever wrote the link.
  const key = authPageErrorKey(searchParams?.get("error"));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-md">
        {/* Same brand block as sign-in and sign-up: whatever failed, the reader
            is still on our site and should be able to see that. */}
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
              Unytea
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          <div
            role="alert"
            className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100"
          >
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900">{t(`${key}.title`)}</h1>
          <p className="text-gray-600">{t(`${key}.body`)}</p>

          <div className="mt-8 space-y-3">
            <Link
              href="/auth/signin"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-medium text-white transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              {t("backToSignIn")}
            </Link>
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-700 transition-colors hover:border-purple-500 hover:text-purple-700"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              {t("backToHome")}
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t.rich("needHelp", {
            contact: (chunks) => (
              <Link href="/contact" className="font-medium text-purple-600 hover:text-purple-700">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}

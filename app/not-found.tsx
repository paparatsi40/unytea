import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass, Home, LogIn, Sparkles } from "lucide-react";

/**
 * The last page anyone should see, and the one that was missing.
 *
 * Without a root `not-found`, every unmatched URL fell through to Next's
 * built-in 404: a bare sans-serif line on white, no logo, no navigation, no way
 * back into the product. That was the actual landing spot for two routes the
 * app itself linked to — `pages.error` and the password-reset link mailed to
 * users — and it will be the landing spot for the next one that goes missing.
 * A styled 404 does not fix a broken link, but it stops a broken link from
 * ending the visit.
 *
 * A Server Component on purpose: the root layout is the only one above this
 * file and it has no `NextIntlClientProvider`, so `useTranslations` would throw
 * here. `getTranslations` reads the same catalog from the request, falling back
 * to the locale cookie and then to English — see `src/i18n.ts`.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
            Unytea
          </span>
        </Link>

        <div className="rounded-2xl border bg-card p-8 shadow-lg">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Compass className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>

          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("code")}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("body")}</p>

          <div className="mt-8 space-y-3">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              {t("backToHome")}
            </Link>
            <Link
              href="/auth/signin"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border px-4 py-3 font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              {t("signIn")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

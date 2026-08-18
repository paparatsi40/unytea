"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Download, X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isAppInstalled,
  isInstallPromptDismissed,
  recordInstallPromptDismissal,
} from "@/lib/pwa-install";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Copy lives here rather than in /locales for the same reason it does in
 * components/gdpr/CookieConsent.tsx: this banner is mounted in app/layout.tsx,
 * which sits OUTSIDE every NextIntlClientProvider in the app. `useTranslations`
 * throws there — it fails the prerender of every static page, which is exactly
 * what happened when this component first reached for it.
 *
 * Wrapping the root layout in a provider would fix the throw and cost the
 * static prerender of the whole marketing site, since resolving the locale
 * server-side means reading a cookie. Not worth it for four strings.
 */
const SUPPORTED = ["en", "es", "fr"] as const;
type SupportedLocale = (typeof SUPPORTED)[number];

const TRANSLATIONS: Record<
  SupportedLocale,
  { title: string; body: string; accept: string; dismiss: string }
> = {
  en: {
    title: "Install Unytea",
    body: "Get the full app experience — faster access, push notifications, and offline support.",
    accept: "Install",
    dismiss: "Not now",
  },
  es: {
    title: "Instala Unytea",
    body: "Llévate la app completa: acceso más rápido, notificaciones y uso sin conexión.",
    accept: "Instalar",
    dismiss: "Ahora no",
  },
  fr: {
    title: "Installez Unytea",
    body: "Profitez de l'app complète : accès plus rapide, notifications et mode hors ligne.",
    accept: "Installer",
    dismiss: "Plus tard",
  },
};

function useLocaleFromPath(): SupportedLocale {
  const pathname = usePathname();
  const firstSeg = pathname?.split("/").filter(Boolean)[0];
  return (SUPPORTED as readonly string[]).includes(firstSeg ?? "")
    ? (firstSeg as SupportedLocale)
    : "en";
}

/** Long enough that the banner doesn't collide with a page still settling in. */
const SHOW_DELAY_MS = 3000;

export function PWAInstallPrompt() {
  const t = TRANSLATIONS[useLocaleFromPath()];
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  /**
   * Whether the banner is off the table for the rest of this page's life.
   *
   * This is the fix. `beforeinstallprompt` is not a one-shot: the browser fires
   * it whenever it re-evaluates installability, including after the user
   * declines its own install dialog. The old handler was unconditional, so
   * every one of those re-fires scheduled another `setShowBanner(true)` — and
   * the record of the dismissal was consulted exactly once, at mount, where a
   * re-fire could never see it. Pressing "Not now" hid the banner for three
   * seconds.
   *
   * A ref rather than state because the listener is registered once, so a state
   * value read inside it would be the one captured at mount, forever.
   */
  const suppressedRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Take the banner off the table for this page, without recording anything. */
  const suppress = useCallback(() => {
    suppressedRef.current = true;
    setShowBanner(false);
    setDeferredPrompt(null);
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  /** A "no" from the user: suppressed here, and remembered across page loads. */
  const dismiss = useCallback(() => {
    suppress();
    recordInstallPromptDismissal();
  }, [suppress]);

  useEffect(() => {
    if (isAppInstalled() || isInstallPromptDismissed()) {
      suppressedRef.current = true;
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (suppressedRef.current) return;

      setDeferredPrompt(event as BeforeInstallPromptEvent);
      // Re-armed rather than stacked: two fires before the delay elapses must
      // not leave a second timer running past a dismissal.
      if (showTimerRef.current !== null) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null;
        setShowBanner(true);
      }, SHOW_DELAY_MS);
    };

    const onAppInstalled = () => suppress();

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      // The old cleanup removed only the first of these. `appinstalled` was
      // registered with an inline arrow, which cannot be removed at all, so
      // every remount left another live listener behind.
      window.removeEventListener("appinstalled", onAppInstalled);
      if (showTimerRef.current !== null) clearTimeout(showTimerRef.current);
    };
  }, [suppress]);

  const handleInstall = useCallback(() => {
    const event = deferredPrompt;
    if (!event) return;

    // Hidden before the browser's own dialog opens, so the banner is not
    // sitting behind it. The event is consumed either way — it cannot be
    // prompted twice.
    suppress();

    void event
      .prompt()
      .then(() => event.userChoice)
      .then(({ outcome }) => {
        // Declining the browser's dialog is a "no" as much as "Not now" is, and
        // Chrome re-offers the install afterwards. Not recording it here is
        // what would walk straight back into the loop this fix is about.
        if (outcome !== "accepted") recordInstallPromptDismissal();
      })
      .catch(() => {
        // prompt() rejects when the event was already consumed or the user
        // gesture expired. The banner stays suppressed for this page; the next
        // load can offer it again.
      });
  }, [deferredPrompt, suppress]);

  // The banner only exists while the browser is actually offering the install.
  // Without the deferred event there is nothing for the Install button to do,
  // so rendering it would be a button that silently does nothing.
  if (!showBanner || !deferredPrompt) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg",
        "duration-500 animate-in fade-in slide-in-from-bottom-5"
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/95 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-4 p-4">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
            <Smartphone className="h-6 w-6 text-purple-400" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">{t.title}</h3>
            <p className="mt-1 text-xs text-zinc-400">{t.body}</p>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
              >
                <Download className="h-3.5 w-3.5" />
                {t.accept}
              </button>
              <button
                onClick={dismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                {t.dismiss}
              </button>
            </div>
          </div>

          {/* Close */}
          <button onClick={dismiss} className="shrink-0 text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Download, X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function PWAInstallPrompt() {
  const t = TRANSLATIONS[useLocaleFromPath()];
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay so it doesn't appear immediately on load
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect when app is installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  if (isInstalled || !showBanner) return null;

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
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                {t.dismiss}
              </button>
            </div>
          </div>

          {/* Close */}
          <button onClick={handleDismiss} className="shrink-0 text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

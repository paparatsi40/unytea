"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
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
        "animate-in slide-in-from-bottom-5 fade-in duration-500"
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/95 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-4 p-4">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
            <Smartphone className="h-6 w-6 text-purple-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Install Unytea
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Get the full app experience — faster access, push notifications,
              and offline support.
            </p>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Not now
              </button>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={handleDismiss}
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

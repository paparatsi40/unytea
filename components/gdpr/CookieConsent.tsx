"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, Settings2, Shield } from "lucide-react";

type CookiePreferences = {
  necessary: true; // always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
};

const CONSENT_KEY = "unytea-cookie-consent";
const PREFERENCES_KEY = "unytea-cookie-preferences";

function getStoredConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "true";
}

function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveConsent(preferences: CookiePreferences) {
  localStorage.setItem(CONSENT_KEY, "true");
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));

  // Dispatch custom event so other parts of the app can react
  window.dispatchEvent(
    new CustomEvent("cookie-consent-updated", { detail: preferences })
  );
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    // Small delay so it doesn't flash on page load
    const timer = setTimeout(() => {
      if (!getStoredConsent()) {
        setVisible(true);
      } else {
        const stored = getStoredPreferences();
        if (stored) setPreferences(stored);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = useCallback(() => {
    const all: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
    };
    saveConsent(all);
    setPreferences(all);
    setVisible(false);
  }, []);

  const handleRejectNonEssential = useCallback(() => {
    const minimal: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
    };
    saveConsent(minimal);
    setPreferences(minimal);
    setVisible(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    saveConsent(preferences);
    setVisible(false);
    setShowSettings(false);
  }, [preferences]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border bg-background/95 backdrop-blur-md shadow-2xl">
        {/* Main banner */}
        {!showSettings && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-1">
                  Cookie Preferences
                </h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies to keep you signed in, remember your
                  preferences, and understand how you use Unytea. You choose
                  which optional cookies to allow.{" "}
                  <Link
                    href="/en/cookies"
                    className="text-primary hover:underline"
                  >
                    Learn more
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAcceptAll}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Customize
              </button>
            </div>
          </div>
        )}

        {/* Granular settings */}
        {showSettings && (
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Cookie Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              {/* Necessary - always on */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Strictly Necessary</p>
                  <p className="text-xs text-muted-foreground">
                    Authentication, security, and core platform functionality.
                    These cannot be disabled.
                  </p>
                </div>
                <div className="shrink-0 mt-0.5">
                  <div className="w-10 h-5 rounded-full bg-primary relative cursor-not-allowed opacity-70">
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" />
                  </div>
                </div>
              </div>

              {/* Functional */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Functional</p>
                  <p className="text-xs text-muted-foreground">
                    Language preferences, theme settings, and interface
                    customizations.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPreferences((p) => ({
                      ...p,
                      functional: !p.functional,
                    }))
                  }
                  className="shrink-0 mt-0.5"
                  role="switch"
                  aria-checked={preferences.functional}
                  aria-label="Toggle functional cookies"
                >
                  <div
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      preferences.functional ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        preferences.functional ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Analytics */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    Performance &amp; Analytics
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Aggregated usage data to help us understand how the platform
                    is used and improve the experience.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPreferences((p) => ({
                      ...p,
                      analytics: !p.analytics,
                    }))
                  }
                  className="shrink-0 mt-0.5"
                  role="switch"
                  aria-checked={preferences.analytics}
                  aria-label="Toggle analytics cookies"
                >
                  <div
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      preferences.analytics ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        preferences.analytics ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSavePreferences}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to check cookie consent status from other components.
 * Returns null if consent hasn't been given yet.
 */
export function useCookiePreferences(): CookiePreferences | null {
  const [prefs, setPrefs] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    setPrefs(getStoredPreferences());

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CookiePreferences>).detail;
      setPrefs(detail);
    };

    window.addEventListener("cookie-consent-updated", handler);
    return () => window.removeEventListener("cookie-consent-updated", handler);
  }, []);

  return prefs;
}

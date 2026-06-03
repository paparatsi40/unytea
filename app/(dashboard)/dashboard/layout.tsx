"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { SubscriptionBannerMount } from "@/components/dashboard/SubscriptionBannerMount";
import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";

// Type for nested translation messages - flexible structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- next-intl message catalogs are deeply-nested locale JSON with per-namespace shapes; next-intl does not expose a generated Messages type, so Record<string, any> is the documented shape. Translation keys are validated at build time against locales/* JSON, not at this type.
type Messages = Record<string, any>;

// Default English messages fallback
const fallbackMessages: Messages = {
  common: {
    search: "Search",
    loading: "Loading...",
    error: "An error occurred",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    submit: "Submit",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    open: "Open",
    all: "All",
    recent: "Recent",
    alphabetical: "Alphabetical",
    mostPopular: "Most Popular",
    comingSoon: "Coming soon",
    featureInDevelopment: "Feature in Development",
    needHelp: "Need help?",
    contactSupport: "Contact our support team for assistance.",
  },
  navigation: {
    dashboard: "Dashboard",
    communities: "Communities",
    messages: "Messages",
    profile: "Profile",
    logout: "Log out",
    signIn: "Sign In",
    signUp: "Sign Up",
    signup: "Sign Up",
    back: "Back",
  },
};

async function loadMessages(locale: string): Promise<Messages> {
  try {
    if (locale === "en") {
      // Try to import dynamically
      const mod = await import("@/locales/en.json");
      return mod.default || fallbackMessages;
    }
    const mod = await import(`@/locales/${locale}.json`);
    return mod.default || fallbackMessages;
  } catch {
    return fallbackMessages;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState("en");
  const [messages, setMessages] = useState<Messages>(fallbackMessages);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Load locale from localStorage or default to 'en'
        const savedLocale = localStorage.getItem("locale") || "en";

        if (mounted) {
          setLocale(savedLocale);
          const loadedMessages = await loadMessages(savedLocale);
          if (mounted) {
            setMessages(loadedMessages);
          }
        }
      } catch (err) {
        console.error("Failed to load locale/messages:", err);
        if (mounted) {
          setError("Failed to load translations");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-background">
        <DashboardSidebar />
        <DashboardHeader />

        <main className="ml-64 pt-16">
          <SubscriptionBannerMount />
          <div className="p-6">{children}</div>
        </main>
      </div>
    </NextIntlClientProvider>
  );
}

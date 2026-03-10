"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { AIWidgetProvider } from "@/components/ai/AIWidgetProvider";
import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";

// Type for nested translation messages - flexible structure
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
    contactSupport: "Contact our support team for assistance."
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
    back: "Back"
  }
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg"
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
          <div className="p-6">
            {children}
          </div>
        </main>

        <AIWidgetProvider />
      </div>
    </NextIntlClientProvider>
  );
}

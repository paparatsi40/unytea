"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { AIWidgetProvider } from "@/components/ai/AIWidgetProvider";
import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";

// Type for nested translation messages
type Messages = {
  [key: string]: string | Messages;
};

// Default English messages for immediate render
import defaultMessages from "@/locales/en.json";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState("en");
  const [messages, setMessages] = useState<Messages>(defaultMessages as Messages);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load locale from localStorage or default to 'en'
    const savedLocale = localStorage.getItem("locale") || "en";
    setLocale(savedLocale);
    
    // Dynamically import messages if different from default
    if (savedLocale !== "en") {
      import(`@/locales/${savedLocale}.json`)
        .then((mod) => setMessages(mod.default))
        .catch(() => {/* keep default */})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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

        {/* AI Assistant Widget - Available on all dashboard pages */}
        <AIWidgetProvider />
      </div>
    </NextIntlClientProvider>
  );
}

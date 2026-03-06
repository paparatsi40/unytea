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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState("en");
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    // Load locale from localStorage or default to 'en'
    const savedLocale = localStorage.getItem("locale") || "en";
    setLocale(savedLocale);
    
    // Dynamically import messages
    import(`@/locales/${savedLocale}.json`)
      .then((mod) => setMessages(mod.default))
      .catch(() => import("@/locales/en.json").then((mod) => setMessages(mod.default)));
  }, []);

  if (!messages) {
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

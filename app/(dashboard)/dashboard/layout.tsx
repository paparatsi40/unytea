"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { AIWidgetProvider } from "@/components/ai/AIWidgetProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}

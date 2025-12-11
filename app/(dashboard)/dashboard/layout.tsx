"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { AIWidgetProvider } from "@/components/ai/AIWidgetProvider";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardHeader />
        <main className="pt-16">
          <div className="p-6">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>

      {/* AI Assistant Widget - Available on all dashboard pages */}
      <AIWidgetProvider />
    </div>
  );
}

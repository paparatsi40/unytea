"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { SubscriptionBannerMount } from "@/components/dashboard/SubscriptionBannerMount";

/**
 * The dashboard chrome: sidebar, header, and the mobile drawer state they share.
 *
 * Split out of the layout so the layout itself can be a server component and
 * resolve the user's locale before anything renders. Only this shell needs to
 * be interactive.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  // Mobile off-canvas drawer state. Desktop (md+) keeps the sidebar permanently
  // visible regardless of this flag.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <DashboardHeader onMenuClick={() => setMobileOpen(true)} />

      {/* Mobile-only backdrop behind the drawer; tap to dismiss. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="pt-16 md:ml-64">
        <SubscriptionBannerMount />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

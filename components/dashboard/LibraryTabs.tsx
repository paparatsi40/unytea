"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Video, FileText } from "lucide-react";

export type LibraryTab = "courses" | "recordings" | "resources";

/**
 * Library tabs UI. Client component so it can localize via the dashboard's
 * client-side NextIntlClientProvider (the (dashboard) tree has no [locale]
 * segment, so server-side getTranslations would not see the user's locale).
 *
 * The active tab is driven by the ?tab= query param, computed server-side in
 * page.tsx, which also renders ONLY the active tab's content and passes it as
 * `children`. This lets server components (CoursesTab/RecordingsTab) and a
 * client component (ResourcesTab) live in the same tab set without breaking
 * the server/client boundary, and avoids fetching inactive tabs. Each trigger
 * is a <Link> that swaps the query param — the URL stays bookmarkable and the
 * Radix Tabs `value` follows the activeTab prop on navigation.
 */
export function LibraryTabs({
  activeTab,
  children,
}: {
  activeTab: LibraryTab;
  children: ReactNode;
}) {
  const t = useTranslations("dashboard.library");

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Tabs value={activeTab} className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="courses" asChild>
            <Link href="?tab=courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t("tabs.courses")}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="recordings" asChild>
            <Link href="?tab=recordings" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              {t("tabs.recordings")}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="resources" asChild>
            <Link href="?tab=resources" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("tabs.resources")}
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* Only the active tab's content is rendered (server-side in page.tsx). */}
        <TabsContent value={activeTab}>{children}</TabsContent>
      </Tabs>
    </div>
  );
}

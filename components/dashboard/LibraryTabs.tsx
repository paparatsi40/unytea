"use client";

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
 * page.tsx and passed in as a prop. Each trigger is a <Link> that swaps the
 * query param — the URL stays bookmarkable and the Radix Tabs `value` follows
 * the prop on re-render.
 */
export function LibraryTabs({ activeTab }: { activeTab: LibraryTab }) {
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

        <TabsContent value="courses">
          <MigratingPlaceholder legacyHref="/dashboard/courses" legacyLabel="/dashboard/courses" />
        </TabsContent>
        <TabsContent value="recordings">
          <MigratingPlaceholder
            legacyHref="/dashboard/recordings"
            legacyLabel="/dashboard/recordings"
          />
        </TabsContent>
        <TabsContent value="resources">
          <MigratingPlaceholder
            legacyHref="/dashboard/knowledge-library"
            legacyLabel="/dashboard/knowledge-library"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Temporary placeholder — Commit 3 replaces these with migrated content.
// Kept in English on purpose: it's transient scaffolding, not shipped copy.
function MigratingPlaceholder({
  legacyHref,
  legacyLabel,
}: {
  legacyHref: string;
  legacyLabel: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <h2 className="mb-2 text-lg font-medium">Content migrating</h2>
      <p className="text-sm text-muted-foreground">
        Tab structure ready. Content migration lands in the next commit.
        <br />
        Still accessible at{" "}
        <Link href={legacyHref} className="underline">
          {legacyLabel}
        </Link>
        .
      </p>
    </div>
  );
}

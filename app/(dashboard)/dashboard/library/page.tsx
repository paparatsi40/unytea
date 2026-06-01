import type { Metadata } from "next";
import { LibraryTabs, type LibraryTab } from "@/components/dashboard/LibraryTabs";
import { CoursesTab } from "@/components/dashboard/library/CoursesTab";
import { RecordingsTab } from "@/components/dashboard/library/RecordingsTab";
import { ResourcesTab } from "@/components/dashboard/library/ResourcesTab";

export const metadata: Metadata = {
  title: "Library — Unytea",
};

const VALID_TABS = ["courses", "recordings", "resources"] as const;

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function LibraryPage(props: Props) {
  const { tab } = await props.searchParams;

  // Default to 'courses' for missing/invalid tab params.
  const activeTab: LibraryTab = VALID_TABS.includes(tab as LibraryTab)
    ? (tab as LibraryTab)
    : "courses";

  // Render only the active tab's content (server-side) and hand it to the
  // client tabs wrapper as children — avoids fetching inactive tabs and keeps
  // server/client components mixed cleanly across tabs.
  const content =
    activeTab === "courses" ? (
      <CoursesTab />
    ) : activeTab === "recordings" ? (
      <RecordingsTab />
    ) : (
      <ResourcesTab />
    );

  return <LibraryTabs activeTab={activeTab}>{content}</LibraryTabs>;
}

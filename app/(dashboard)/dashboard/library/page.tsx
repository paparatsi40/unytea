import type { Metadata } from "next";
import { LibraryTabs, type LibraryTab } from "@/components/dashboard/LibraryTabs";

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

  return <LibraryTabs activeTab={activeTab} />;
}

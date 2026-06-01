import { permanentRedirect } from "next/navigation";

// Sub-Phase E Commit 3: Recordings consolidated into the Library route.
// 308 permanent redirect preserves bookmarks / external links.
export default function RecordingsRedirect() {
  permanentRedirect("/dashboard/library?tab=recordings");
}

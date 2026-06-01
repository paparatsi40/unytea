import { permanentRedirect } from "next/navigation";

// Sub-Phase E Commit 3: Knowledge Library consolidated into the Library route
// as the "Resources" tab. 308 permanent redirect preserves bookmarks /
// external links.
export default function KnowledgeLibraryRedirect() {
  permanentRedirect("/dashboard/library?tab=resources");
}

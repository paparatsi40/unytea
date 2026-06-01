import { permanentRedirect } from "next/navigation";

// Sub-Phase E Commit 3: Courses consolidated into the Library route.
// 308 permanent redirect preserves bookmarks / external links. Sub-routes
// (/dashboard/courses/[courseId], /dashboard/courses/browse, etc.) are
// unaffected — only this root index redirects.
export default function CoursesRedirect() {
  permanentRedirect("/dashboard/library?tab=courses");
}

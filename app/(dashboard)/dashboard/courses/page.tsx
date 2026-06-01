import { permanentRedirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[]>>;
};

// Sub-Phase E: Courses consolidated into the Library route. 308 permanent
// redirect preserves bookmarks / external links AND any incoming query string
// (e.g. ?filter=published). Sub-routes (/dashboard/courses/[courseId],
// /dashboard/courses/browse) are unaffected — only this root index redirects.
export default async function CoursesRedirect(props: Props) {
  const sp = await props.searchParams;
  const params = new URLSearchParams();
  params.set("tab", "courses");
  for (const [k, v] of Object.entries(sp)) {
    if (k === "tab") continue; // don't override the tab selector
    if (typeof v === "string") params.set(k, v);
    else if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
  }
  permanentRedirect(`/dashboard/library?${params.toString()}`);
}

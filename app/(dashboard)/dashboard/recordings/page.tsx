import { permanentRedirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[]>>;
};

// Sub-Phase E: Recordings consolidated into the Library route. 308 permanent
// redirect preserves bookmarks / external links AND any incoming query string.
export default async function RecordingsRedirect(props: Props) {
  const sp = await props.searchParams;
  const params = new URLSearchParams();
  params.set("tab", "recordings");
  for (const [k, v] of Object.entries(sp)) {
    if (k === "tab") continue;
    if (typeof v === "string") params.set(k, v);
    else if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
  }
  permanentRedirect(`/dashboard/library?${params.toString()}`);
}

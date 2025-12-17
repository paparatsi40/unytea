import { redirect } from "next/navigation";

export default async function OldCommunityRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Redirect old route to new communities route
  redirect(`/${locale}/dashboard/communities`);
}

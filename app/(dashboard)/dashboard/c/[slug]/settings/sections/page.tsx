import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SectionsRedirectPage(props: Props) {
  const params = await props.params;
  redirect(`/dashboard/c/${params.slug}/settings/landing`);
}

import { redirect } from "next/navigation";

type Props = {
  params: { slug: string };
};

export default function SectionsRedirectPage({ params }: Props) {
  redirect(`/dashboard/c/${params.slug}/settings/landing`);
}

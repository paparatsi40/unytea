import { notFound } from "next/navigation";
import CommunityChatClient from "./ChatClient";

export default async function CommunityChatPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  // Fetch community name for the header
  let communityName = "Community";
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://www.unytea.com"}/api/communities/${slug}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    if (data.success) {
      communityName = data.community.name;
    }
  } catch (error) {
    console.error("Error fetching community:", error);
  }

  return <CommunityChatClient slug={slug} communityName={communityName} />;
}

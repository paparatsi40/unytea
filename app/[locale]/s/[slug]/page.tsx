import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicSessionBySlug,
  getRelatedSessions,
  getNextCommunitySession,
  getRelatedCommunitiesHostingThisWeek,
} from "@/app/actions/public-sessions";
import { PublicSessionPage } from "@/components/sessions/PublicSessionPage";
import { SessionJsonLd } from "@/components/sessions/SessionJsonLd";

interface Props {
  params: { slug: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getPublicSessionBySlug(params.slug);

  if (!session) {
    return {
      title: "Session Not Found | Unytea",
      description: "This session could not be found.",
    };
  }

  const isLive = session.status === "IN_PROGRESS";
  const isUpcoming = session.status === "SCHEDULED";
  const isPast = session.status === "COMPLETED";

  let title = session.title;
  if (isLive) title = `🔴 LIVE: ${session.title}`;
  else if (isUpcoming) title = `📅 Upcoming: ${session.title}`;
  else if (isPast) title = `🎥 Replay: ${session.title}`;

  const description =
    session.description?.slice(0, 160) ||
    `Join ${session.mentor.name || "our expert"} for an interactive session on Unytea.`;

  const imageUrl =
    session.community?.imageUrl ||
    session.mentor.image ||
    "https://www.unytea.com/og-image.png";

  return {
    title,
    description,
    keywords: [
      "live session",
      "online learning",
      "community",
      session.mentor.name || "",
      session.community?.name || "",
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      siteName: "Unytea",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `https://www.unytea.com/s/${params.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function Page({ params }: Props) {
  const session = await getPublicSessionBySlug(params.slug);

  if (!session) {
    notFound();
  }

  const [relatedResult, nextSessionResult, relatedCommunitiesResult] = await Promise.all([
    getRelatedSessions(session.community.id, session.id, 3),
    getNextCommunitySession(session.community.id),
    getRelatedCommunitiesHostingThisWeek(session.community.id, 4),
  ]);

  return (
    <>
      <SessionJsonLd session={session} />
      <PublicSessionPage
        session={session}
        locale={params.locale}
        relatedSessions={relatedResult.success ? relatedResult.sessions || [] : []}
        relatedCommunities={relatedCommunitiesResult.success ? relatedCommunitiesResult.communities || [] : []}
        nextSession={nextSessionResult.success ? nextSessionResult.session ?? null : null}
      />
    </>
  );
}

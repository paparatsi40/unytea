import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSession, getRelatedSessions } from "@/app/actions/public-sessions";
import { PublicSessionPage } from "@/components/sessions/PublicSessionPage";

interface PublicSessionRouteProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PublicSessionRouteProps): Promise<Metadata> {
  const result = await getPublicSession(params.slug);
  
  if (!result.success || !result.session) {
    return {
      title: "Session Not Found | Unytea",
      description: "This session is not available.",
    };
  }

  const session = result.session;
  const hostName = session.host.name || "Host";
  const communityName = session.community.name;
  
  const title = `${session.title} | ${hostName} | ${communityName}`;
  const description = session.description || 
    `Watch this session from ${communityName} hosted by ${hostName}. Join the community to access more live sessions and recordings.`;

  return {
    title,
    description,
    keywords: [session.title, hostName, communityName, "live session", "recording", "community learning"],
    authors: [{ name: hostName }],
    openGraph: {
      title,
      description,
      type: "video.other",
      url: `https://unytea.com/sessions/${session.slug}`,
      images: [
        {
          url: session.community.image || "/og-default.jpg",
          width: 1200,
          height: 630,
          alt: session.title,
        },
      ],
      videos: session.recording?.url
        ? [
            {
              url: session.recording.url,
              type: "video/mp4",
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [session.community.image || "/og-default.jpg"],
    },
    alternates: {
      canonical: `https://unytea.com/sessions/${session.slug}`,
    },
  };
}

export default async function PublicSessionRoute({ params }: PublicSessionRouteProps) {
  const sessionResult = await getPublicSession(params.slug);
  
  if (!sessionResult.success || !sessionResult.session) {
    notFound();
  }

  const session = sessionResult.session;
  
  const relatedResult = await getRelatedSessions(
    session.community.id,
    session.id,
    3
  );

  return (
    <PublicSessionPage
      session={session}
      relatedSessions={relatedResult.success ? relatedResult.sessions || [] : []}
    />
  );
}
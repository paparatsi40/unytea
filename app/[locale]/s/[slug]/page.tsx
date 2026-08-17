import { cache } from "react";
import { isActionFailure } from "@/lib/actions/errors";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getPublicSessionBySlug,
  getRelatedSessions,
  getNextCommunitySession,
  getRelatedCommunitiesHostingThisWeek,
} from "@/app/actions/public-sessions";
import { PublicSessionPage } from "@/components/sessions/PublicSessionPage";
import { SessionJsonLd } from "@/components/sessions/SessionJsonLd";
import { SITE_URL } from "@/lib/site-url";
import { baseOpenGraph } from "@/lib/seo/open-graph";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

// Dedupe the session fetch across generateMetadata + the page render (both run
// in the same request). Without this React cache() the slug was queried twice.
// getPublicSessionBySlug now goes through defineAction and can return an
// ActionFailure (e.g. rate limited). Collapse that to null here so both the
// metadata and page paths keep their existing "missing session" handling.
const getCachedSession = cache(async (slug: string) => {
  const result = await getPublicSessionBySlug(slug);
  if (isActionFailure(result)) return null;
  return result;
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({
    locale: params.locale,
    namespace: "liveSession.publicPage.metadata",
  });
  const session = await getCachedSession(params.slug);

  if (!session) {
    return {
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
    };
  }

  const isLive = session.status === "IN_PROGRESS";
  const isUpcoming = session.status === "SCHEDULED";
  const isPast = session.status === "COMPLETED";

  let title = session.title;
  if (isLive) title = `🔴 ${t("titleLive", { title: session.title })}`;
  else if (isUpcoming) title = `📅 ${t("titleUpcoming", { title: session.title })}`;
  else if (isPast) title = `🎥 ${t("titleReplay", { title: session.title })}`;

  const description =
    session.description?.slice(0, 160) ||
    t("descriptionFallback", { name: session.mentor.name || t("defaultExpert") });

  // Same broken fallback as the community page: /og-image.png is not in
  // public/. Left undefined, the shared defaults supply the /og route instead.
  const imageUrl = session.community?.imageUrl || session.mentor.image;

  // This page's canonical carries no locale prefix, so its og:url cannot come
  // from `localizedOpenGraph`. It has to match the canonical below exactly —
  // og:url is the page's identity in the graph, and one pointing at the
  // homepage would attribute every share of a session to the homepage.
  const canonical = `${SITE_URL}/s/${params.slug}`;

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
      ...baseOpenGraph,
      url: canonical,
      title,
      description,
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl ?? "/og"],
    },
    alternates: {
      canonical,
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

export default async function Page(props: Props) {
  const params = await props.params;
  const session = await getCachedSession(params.slug);

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
        relatedCommunities={
          relatedCommunitiesResult.success ? relatedCommunitiesResult.communities || [] : []
        }
        nextSession={nextSessionResult.success ? (nextSessionResult.session ?? null) : null}
      />
    </>
  );
}

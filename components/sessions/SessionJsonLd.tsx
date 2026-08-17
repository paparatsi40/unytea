"use client";

import { PublicSessionData } from "@/app/actions/public-sessions";
import { jsonLdSafe } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site-url";

interface Props {
  session: PublicSessionData;
}

export function SessionJsonLd({ session }: Props) {
  const isLive = session.status === "IN_PROGRESS";
  const isUpcoming = session.status === "SCHEDULED";

  /**
   * The image Google shows for this session, best available first.
   *
   * The fallback used to be `${SITE_URL}/og-image.png`, which is not in
   * `public/` — so every session without a community cover or a host avatar
   * handed Google a 404 as its structured-data image. `/og` is the route that
   * renders one, and it is what the Open Graph defaults already use, so the
   * rich snippet and the social card no longer disagree.
   *
   * One constant for both blocks below: `thumbnailUrl` had no fallback at all
   * and emitted a literal `null` into the VideoObject when neither image
   * existed, which is invalid structured data rather than an absent field.
   */
  const previewImage = session.community?.imageUrl || session.host.image || `${SITE_URL}/og`;

  const eventData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: session.title,
    description: session.description || `Join ${session.host.name} for an interactive session`,
    image: previewImage,
    startDate: session.scheduledAt.toISOString(),
    endDate: new Date(
      session.scheduledAt.getTime() + (session.duration || 60) * 60000
    ).toISOString(),
    eventStatus: isLive
      ? "https://schema.org/EventInProgress"
      : isUpcoming
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventOccurred",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url: `${SITE_URL}/s/${session.slug}`,
    },
    organizer: session.community
      ? {
          "@type": "Organization",
          name: session.community.name,
          url: `${SITE_URL}/c/${session.community.slug}`,
        }
      : undefined,
    performer: {
      "@type": "Person",
      name: session.host.name || "Host",
      image: session.host.image || undefined,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: isUpcoming ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `${SITE_URL}/s/${session.slug}`,
    },
    isAccessibleForFree: true,
    duration: `PT${session.duration}M`,
  };

  // Add video recording schema if available
  const videoData = session.recording?.url
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `Recording: ${session.title}`,
        description: session.description || session.title,
        thumbnailUrl: previewImage,
        uploadDate: session.scheduledAt.toISOString(),
        duration: session.recording.durationSeconds
          ? `PT${Math.floor(session.recording.durationSeconds / 60)}M${session.recording.durationSeconds % 60}S`
          : `PT${session.duration}M`,
        contentUrl: session.recording.url,
        embedUrl: session.recording.url,
      }
    : null;

  const breadcrumbsData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Unytea",
        item: SITE_URL,
      },
      ...(session.community
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: session.community.name,
              item: `${SITE_URL}/c/${session.community.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: session.community ? 3 : 2,
        name: session.title,
        item: `${SITE_URL}/s/${session.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(eventData) }}
      />
      {videoData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(videoData) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbsData) }}
      />
    </>
  );
}

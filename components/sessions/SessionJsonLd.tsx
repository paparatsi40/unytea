"use client";

import { PublicSessionData } from "@/app/actions/public-sessions";

interface Props {
  session: PublicSessionData;
}

export function SessionJsonLd({ session }: Props) {
  const isLive = session.status === "IN_PROGRESS";
  const isUpcoming = session.status === "SCHEDULED";

  const eventData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: session.title,
    description: session.description || `Join ${session.mentor.name} for an interactive session`,
    image: session.community?.imageUrl || session.mentor.image || "https://www.unytea.com/og-image.png",
    startDate: session.scheduledAt.toISOString(),
    endDate: new Date(
      session.scheduledAt.getTime() + session.duration * 60000
    ).toISOString(),
    eventStatus: isLive
      ? "https://schema.org/EventInProgress"
      : isUpcoming
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventOccurred",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url: `https://www.unytea.com/s/${session.slug}`,
    },
    organizer: session.community
      ? {
          "@type": "Organization",
          name: session.community.name,
          url: `https://www.unytea.com/c/${session.community.slug}`,
        }
      : undefined,
    performer: {
      "@type": "Person",
      name: session.mentor.name || "Host",
      image: session.mentor.image || undefined,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: isUpcoming ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `https://www.unytea.com/s/${session.slug}`,
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
        thumbnailUrl: session.community?.imageUrl || session.mentor.image,
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
        item: "https://www.unytea.com",
      },
      ...(session.community
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: session.community.name,
              item: `https://www.unytea.com/c/${session.community.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: session.community ? 3 : 2,
        name: session.title,
        item: `https://www.unytea.com/s/${session.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventData) }}
      />
      {videoData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoData) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsData) }}
      />
    </>
  );
}

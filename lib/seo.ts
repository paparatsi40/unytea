// lib/seo.ts
import { Metadata } from "next";

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  path?: string;
  noindex?: boolean;
  locale?: string;
  type?: "website" | "article" | "profile";
}

/**
 * Generate comprehensive metadata for a page
 * 
 * Usage:
 * export const metadata = generateMetadata({
 *   title: "Pricing",
 *   description: "Choose the best plan for you",
 *   path: "/pricing"
 * });
 */
export function generateMetadata({
  title,
  description,
  keywords = [],
  image = "/branding/cover/unytea-cover.jpg",
  path = "",
  noindex = false,
  locale = "en",
  type = "website",
}: SEOConfig): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fullUrl = `${baseUrl}${path}`;
  const fullTitle = title === "Unytea" ? title : `${title} | Unytea`;

  const defaultKeywords = [
    "mentoring",
    "community",
    "learning",
    "mentorship",
    "education",
    "professional development",
    "peer learning",
    "online courses",
    "video mentoring",
  ];

  return {
    title: fullTitle,
    description,
    keywords: [...defaultKeywords, ...keywords],
    
    // Robots
    robots: noindex
      ? {
          index: false,
          follow: false,
        }
      : {
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

    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: "Unytea",
      images: [
        {
          url: `${baseUrl}${image}`,
          width: 1500,
          height: 500,
          alt: title,
        },
      ],
      locale: locale === "es" ? "es_ES" : "en_US",
      type,
    },

    // Twitter
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${baseUrl}${image}`],
      creator: "@unytea",
    },

    // Alternate languages
    alternates: {
      canonical: fullUrl,
      languages: {
        en: `${baseUrl}/en${path}`,
        es: `${baseUrl}/es${path}`,
      },
    },
  };
}

/**
 * Generate metadata for dynamic pages (communities, courses, etc.)
 */
export function generateDynamicMetadata({
  title,
  description,
  image,
  author,
  publishedTime,
  modifiedTime,
  tags = [],
  path,
}: {
  title: string;
  description: string;
  image?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  path: string;
}): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    ...generateMetadata({
      title,
      description,
      keywords: tags,
      image,
      path,
      type: "article",
    }),
    
    // Article-specific metadata
    openGraph: {
      title,
      description,
      url: `${baseUrl}${path}`,
      siteName: "Unytea",
      images: image ? [{ url: `${baseUrl}${image}` }] : undefined,
      type: "article",
      publishedTime,
      modifiedTime,
      authors: author ? [author] : undefined,
      tags,
    },
  };
}

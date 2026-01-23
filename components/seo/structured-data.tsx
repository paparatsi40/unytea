// components/seo/structured-data.tsx

/**
 * Organization Structured Data (JSON-LD)
 * Add to root layout for site-wide info
 */
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Unytea",
    alternateName: "Mentorly",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://www.unytea.com",
    logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.unytea.com"}/branding/logo/unytea-logo.svg`,
    description: "Where Mentors & Mentees Unite. Build meaningful connections, learn together, and grow through mentorship in engaged communities.",
    foundingDate: "2024",
    sameAs: [
      // Add your social media profiles
      "https://twitter.com/unytea",
      "https://www.linkedin.com/company/unytea",
      // "https://www.facebook.com/unytea",
      // "https://www.instagram.com/unytea",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@unytea.com",
      availableLanguage: ["English", "Spanish"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Website Structured Data
 * Add to root layout
 */
export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Unytea",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://www.unytea.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.unytea.com"}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * SoftwareApplication Schema
 * For SaaS/Platform listing
 */
export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Unytea",
    operatingSystem: "Web, iOS, Android",
    applicationCategory: "EducationalApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free trial available",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1250",
      bestRating: "5",
      worstRating: "1",
    },
    description: "Professional mentorship and community platform for learning and growth.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * BreadcrumbList Schema
 * Use in pages with navigation hierarchy
 * 
 * Example usage:
 * <BreadcrumbSchema items={[
 *   { name: 'Home', url: '/' },
 *   { name: 'Pricing', url: '/pricing' }
 * ]} />
 */
export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.unytea.com";
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * FAQ Schema
 * Use in FAQ sections
 * 
 * Example usage:
 * <FAQSchema items={[
 *   { question: 'What is Unytea?', answer: 'A mentorship platform...' }
 * ]} />
 */
export function FAQSchema({ items }: { items: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Course Schema
 * Use for individual courses
 */
export function CourseSchema({
  name,
  description,
  provider,
  price,
  url,
}: {
  name: string;
  description: string;
  provider: string;
  price?: number;
  url: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: provider,
      sameAs: process.env.NEXT_PUBLIC_APP_URL || "https://www.unytea.com",
    },
    offers: price
      ? {
          "@type": "Offer",
          price: price.toString(),
          priceCurrency: "USD",
        }
      : undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Video Schema
 * Use for video content/courses
 */
export function VideoSchema({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  contentUrl,
}: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string; // ISO 8601 format: PT1H30M
  contentUrl: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    contentUrl,
    embedUrl: contentUrl,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

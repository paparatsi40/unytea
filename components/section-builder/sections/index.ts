import React from "react";
import { SectionType, SectionSchema } from "../types";
import { HeroSchema } from "./Hero";
import { FeaturesSchema } from "./Features";
import { CTASchema } from "./CTA";
import { TestimonialsSchema } from "./Testimonials";
import { FAQSchema } from "./FAQ";
import { StatsSchema } from "./Stats";
import { OwnerBioSchema } from "./OwnerBio";
import { GallerySchema } from "./Gallery";

/**
 * SECTIONS REGISTRY
 * Single source of truth for all available sections
 */
export const SECTIONS: Record<SectionType, SectionSchema> = {
  hero: HeroSchema,
  features: FeaturesSchema,
  cta: CTASchema,
  testimonials: TestimonialsSchema,
  faq: FAQSchema,
  stats: StatsSchema,
  ownerBio: OwnerBioSchema,
  gallery: GallerySchema,
  
  pricing: {
    type: "pricing",
    label: "Pricing",
    description: "Link people to your plans",
    icon: "💰",
    defaultProps: {
      title: "Choose the plan that fits you",
      subtitle: "Compare options and start with the best plan for your goals.",
      ctaText: "View plans",
      ctaUrl: "/pricing",
    },
    fields: [
      { key: "title", label: "Title", kind: "text", placeholder: "Choose the plan that fits you" },
      { key: "subtitle", label: "Subtitle", kind: "textarea", placeholder: "Compare options and start..." },
      { key: "ctaText", label: "Button label", kind: "text", placeholder: "View plans" },
      { key: "ctaUrl", label: "Plans URL", kind: "url", placeholder: "/pricing" },
    ],
    Render: () => React.createElement('div', { className: "p-8 text-center text-gray-500" }, "Pricing section"),
  },
  video: {
    type: "video",
    label: "Video",
    description: "Embed your intro or sales video",
    icon: "🎥",
    defaultProps: {
      title: "Watch the intro",
      description: "Add your video URL to show it here.",
      videoUrl: "",
      thumbnailUrl: "",
    },
    fields: [
      { key: "title", label: "Title", kind: "text", placeholder: "Watch the intro" },
      { key: "description", label: "Description", kind: "textarea", placeholder: "Add context for this video" },
      { key: "videoUrl", label: "Video URL", kind: "url", placeholder: "https://www.youtube.com/watch?v=..." },
      { key: "thumbnailUrl", label: "Thumbnail URL", kind: "url", placeholder: "https://..." },
    ],
    Render: () => React.createElement('div', { className: "p-8 text-center text-gray-500" }, "Video section"),
  },
};

/**
 * Get ordered list of sections for the palette
 */
export const SECTION_ORDER: SectionType[] = [
  "hero",
  "features",
  "ownerBio",
  "stats",
  "testimonials",
  "gallery",
  "faq",
  "cta",
  "pricing",
  "video",
];

/**
 * Export individual schemas for direct use
 */
export {
  HeroSchema,
  FeaturesSchema,
  CTASchema,
  TestimonialsSchema,
  FAQSchema,
  StatsSchema,
  OwnerBioSchema,
  GallerySchema,
};

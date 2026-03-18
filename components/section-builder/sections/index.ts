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
  
  // Placeholders for future sections
  pricing: {
    type: "pricing",
    label: "Pricing",
    description: "Pricing tiers (coming soon)",
    icon: "💰",
    defaultProps: {},
    fields: [],
    Render: () => React.createElement('div', { className: "p-8 text-center text-gray-500" }, "Pricing section coming soon"),
  },
  video: {
    type: "video",
    label: "Video",
    description: "Embed video (coming soon)",
    icon: "🎥",
    defaultProps: {},
    fields: [],
    Render: () => React.createElement('div', { className: "p-8 text-center text-gray-500" }, "Video section coming soon"),
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

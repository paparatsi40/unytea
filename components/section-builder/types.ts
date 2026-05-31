/** ========== Section Builder Types ========== */

import type { JSX } from "react";

export type SectionType =
  | "hero"
  | "features"
  | "cta"
  | "testimonials"
  | "faq"
  | "stats"
  | "ownerBio"
  | "gallery"
  | "pricing"
  | "video"
  | "upcomingSessions" // NEW (Sub-Phase D)
  | "postsFeed" // NEW (Sub-Phase D)
  | "membershipTiers"; // NEW (Sub-Phase D)

export type FieldKind = "text" | "textarea" | "image" | "url" | "number" | "color" | "select";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: string[]; // for select fields
}

export interface SectionSchema {
  type: SectionType;
  label: string;
  description: string;
  icon: string; // emoji
  fields: FieldDef[];
  defaultProps: Record<string, any>;
  // Render may be an async Server Component (e.g. data-driven sections like
  // UpcomingSessions that fetch from Prisma), hence the Promise union.
  Render: (props: Record<string, any>) => JSX.Element | Promise<JSX.Element>;
}

export interface SectionInstance {
  id: string;
  type: SectionType;
  props: Record<string, any>;
}

export interface LandingLayout {
  sections: SectionInstance[];
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    font?: string;
  };
}

/**
 * Community context injected into section props by the public landing page
 * (app/[locale]/c/[slug]/page.tsx). Sections that need live community data
 * (Hero, OwnerBio, Stats) read these; presentational sections ignore them.
 * Absent in the section-builder preview, so consumers must degrade gracefully.
 */
export type LandingActivityStatus = "very_active" | "active" | "moderate" | "quiet";

export interface LandingSampleMember {
  id: string;
  name: string;
  image: string | null;
  initials: string;
}

export interface LandingCommunity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null; // community logo
  coverImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  isPaid: boolean;
  memberCount: number;
  ownerTitle: string | null;
  ownerLinks: unknown; // Json column
  owner: { id: string; name: string | null; image: string | null };
}

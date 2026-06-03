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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Polymorphic section payload: each SectionType variant has a distinct prop shape and the builder is generic over SectionType[]. Per-section validation happens via the FieldDef[] schema above; a discriminated union here would duplicate every section's schema and break the dynamic builder UX.
  defaultProps: Record<string, any>;
  // Render may be an async Server Component (e.g. data-driven sections like
  // UpcomingSessions that fetch from Prisma), hence the Promise union.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Render fns receive props as Record<string, any> from the builder runtime; each section validates its own shape via the FieldDef[] schema above. Builder is generic over all SectionTypes.
  Render: (props: Record<string, any>) => JSX.Element | Promise<JSX.Element>;
}

export interface SectionInstance {
  id: string;
  type: SectionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Polymorphic section payload: props shape depends on the SectionType variant and is validated per-section via FieldDef[] (see SectionSchema above). A union would duplicate every section's schema.
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

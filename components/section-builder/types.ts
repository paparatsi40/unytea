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

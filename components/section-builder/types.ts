/** ========== Section Builder Types ========== */

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
  | "video";

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
  Render: (props: Record<string, any>) => JSX.Element;
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

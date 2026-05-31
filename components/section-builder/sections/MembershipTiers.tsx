import type { JSX } from "react";
import { SectionSchema } from "../types";

interface MembershipTiersRenderProps {
  communityId?: string;
  title?: string;
  showFreeTier?: boolean;
}

export function MembershipTiersRender(props: MembershipTiersRenderProps): JSX.Element {
  // STUB: real implementation lands in Commit 4 of Sub-Phase D.
  // Renders nothing for now so existing landings don't break.
  void props;
  return (
    <section
      className="py-8"
      aria-label="Membership tiers placeholder"
      data-section-type="membershipTiers"
    />
  );
}

export const MembershipTiersSchema: SectionSchema = {
  type: "membershipTiers",
  label: "Membership tiers",
  description: "Membership tiers and pricing for joining the community",
  icon: "💎",
  fields: [
    {
      key: "title",
      label: "Section title",
      kind: "text",
      placeholder: "Become a member",
    },
    {
      key: "showFreeTier",
      label: "Show free tier",
      kind: "select",
      options: ["false", "true"],
    },
  ],
  defaultProps: {
    title: "Become a member",
    showFreeTier: false,
  },
  Render: MembershipTiersRender,
};

import type { JSX } from "react";
import { SectionSchema } from "../types";

interface UpcomingSessionsRenderProps {
  communityId?: string;
  title?: string;
  limit?: number;
}

export function UpcomingSessionsRender(props: UpcomingSessionsRenderProps): JSX.Element {
  // STUB: real implementation lands in Commit 2 of Sub-Phase D.
  // Renders nothing for now so existing landings don't break.
  void props;
  return (
    <section
      className="py-8"
      aria-label="Upcoming sessions placeholder"
      data-section-type="upcomingSessions"
    />
  );
}

export const UpcomingSessionsSchema: SectionSchema = {
  type: "upcomingSessions",
  label: "Upcoming sessions",
  description: "Shows the next live sessions in this community",
  icon: "📅",
  fields: [
    {
      key: "title",
      label: "Section title",
      kind: "text",
      placeholder: "Upcoming sessions",
    },
    { key: "limit", label: "Max sessions to show", kind: "number" },
  ],
  defaultProps: {
    title: "Upcoming sessions",
    limit: 5,
  },
  Render: UpcomingSessionsRender,
};

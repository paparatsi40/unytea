import type { JSX } from "react";
import { SectionSchema } from "../types";

interface PostsFeedRenderProps {
  communityId?: string;
  title?: string;
  limit?: number;
}

export function PostsFeedRender(props: PostsFeedRenderProps): JSX.Element {
  // STUB: real implementation lands in Commit 3 of Sub-Phase D.
  // Renders nothing for now so existing landings don't break.
  void props;
  return (
    <section
      className="py-8"
      aria-label="Posts feed placeholder"
      data-section-type="postsFeed"
    />
  );
}

export const PostsFeedSchema: SectionSchema = {
  type: "postsFeed",
  label: "Posts feed",
  description: "Recent posts from members and the host",
  icon: "📝",
  fields: [
    {
      key: "title",
      label: "Section title",
      kind: "text",
      placeholder: "Latest from the community",
    },
    { key: "limit", label: "Max posts to show", kind: "number" },
  ],
  defaultProps: {
    title: "Latest from the community",
    limit: 5,
  },
  Render: PostsFeedRender,
};

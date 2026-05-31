import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import { SectionSchema } from "../types";

interface PostsFeedRenderProps {
  communityId?: string;
  communitySlug?: string;
  title?: string;
  limit?: number;
}

type PostRowData = {
  id: string;
  title: string | null;
  content: string;
  attachments: unknown;
  createdAt: Date;
  author: { id: string; name: string | null; image: string | null };
  _count: { reactions: number; comments: number };
};

// Post images are stored in the `attachments` JSON column as
// { url, name, type }[] (see PostAttachment in community feed components),
// not a dedicated imageUrl field. Pull the first image-typed attachment.
function firstImageUrl(attachments: unknown): string | null {
  if (!Array.isArray(attachments)) return null;
  for (const att of attachments) {
    if (att && typeof att === "object" && "url" in att) {
      const a = att as { url?: unknown; type?: unknown };
      const url = typeof a.url === "string" ? a.url : null;
      if (!url) continue;
      if (a.type === "image" || /\.(png|jpe?g|gif|webp|svg)$/i.test(url)) return url;
    }
  }
  return null;
}

// Post.content is a plain String column (may contain light markdown). Strip
// any tags, collapse whitespace, and trim to a short excerpt.
function extractExcerpt(content: string, max = 120): string {
  const plain = content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

export async function PostsFeedRender(props: PostsFeedRenderProps): Promise<JSX.Element> {
  const { communityId, communitySlug, title, limit = 5 } = props;

  if (!communityId) {
    // Defensive: section configured but no community context. Render nothing.
    return <></>;
  }

  // String form resolves the request locale (this renders under app/[locale]).
  const t = await getTranslations("community.landing.postsFeed");
  const heading = title || t("defaultTitle");

  const posts = await prisma.post.findMany({
    where: {
      communityId,
      deletedAt: null, // soft-delete guard
      isPublished: true, // public landing shows published posts only
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      attachments: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { reactions: true, comments: true } },
    },
  });

  if (posts.length === 0) {
    return (
      <section className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-xl font-medium">{heading}</h2>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-xl font-medium">{heading}</h2>
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              unknownAuthorLabel={t("unknownAuthor")}
              untitledLabel={t("untitled")}
            />
          ))}
        </div>
        {communitySlug && (
          <div className="mt-4 text-center">
            <Link
              href={`/dashboard/c/${communitySlug}/feed`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// Inline helper component
function PostRow({
  post,
  unknownAuthorLabel,
  untitledLabel,
}: {
  post: PostRowData;
  unknownAuthorLabel: string;
  untitledLabel: string;
}) {
  const imageUrl = firstImageUrl(post.attachments);
  const heading = post.title || extractExcerpt(post.content, 80) || untitledLabel;

  return (
    <div className="flex gap-3">
      {/* Image preview */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill unoptimized sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-2xl">📝</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{post.author?.name ?? unknownAuthorLabel}</span>
          <span>·</span>
          <time>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</time>
        </div>
        <h3 className="mb-1 line-clamp-1 text-sm font-medium">{heading}</h3>
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
          {extractExcerpt(post.content)}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {post._count?.reactions ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {post._count?.comments ?? 0}
          </span>
        </div>
      </div>
    </div>
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

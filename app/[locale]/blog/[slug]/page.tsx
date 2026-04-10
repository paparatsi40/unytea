import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllPosts, getPostBySlug } from "../posts";

type Props = {
  params: {
    locale: string;
    slug: string;
  };
};

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Article not found | Unytea Blog",
    };
  }

  return {
    title: `${post.title} | Unytea Blog`,
    description: post.excerpt,
  };
}

export default function BlogPostPage({ params }: Props) {
  const { locale, slug } = params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        <p className="text-sm text-muted-foreground mb-3">Blog</p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {post.date} · {post.readTime} · {post.author}
        </p>

        <div className="space-y-5 text-lg leading-8 text-foreground/90">
          {post.content.map((paragraph, index) => (
            <p key={`${post.slug}-${index}`}>{paragraph}</p>
          ))}
        </div>

        <div className="pt-10 flex gap-4">
          <Link href={`/${locale}/blog`} className="text-sm font-medium text-primary hover:underline">
            ← Back to Blog
          </Link>
          <Link href={`/${locale}`} className="text-sm font-medium text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </article>
    </main>
  );
}

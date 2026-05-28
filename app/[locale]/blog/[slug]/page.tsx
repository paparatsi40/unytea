import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "../posts";

export const dynamic = "force-dynamic";

type RouteParams = {
  locale: string;
  slug: string;
};

type Props = {
  params: Promise<RouteParams>;
};

function getSafeBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    return "https://unytea.com";
  }

  try {
    const normalized = raw.startsWith("http") ? raw : `https://${raw}`;
    const parsed = new URL(normalized);
    return parsed.origin;
  } catch {
    return "https://unytea.com";
  }
}

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Article not found | Unytea Blog",
    };
  }

  const baseUrl = getSafeBaseUrl();
  const canonicalUrl = `${baseUrl}/${locale}/blog/${post.slug}`;

  return {
    title: `${post.title} | Unytea Blog`,
    description: post.seoDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${post.title} | Unytea Blog`,
      description: post.seoDescription,
      type: "article",
      url: canonicalUrl,
      images: [
        {
          url: post.featuredImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Unytea Blog`,
      description: post.seoDescription,
      images: [post.featuredImage],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const baseUrl = getSafeBaseUrl();
  const articleUrl = `${baseUrl}/${locale}/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription,
    image: [post.featuredImage],
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Unytea",
    },
    mainEntityOfPage: articleUrl,
  };

  return (
    <main className="min-h-screen bg-background">
      <article className="container mx-auto max-w-3xl px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <p className="mb-3 text-sm text-muted-foreground">Blog</p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{post.title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {post.date} · {post.readTime} · {post.author}
        </p>

        <div className="relative mb-8 h-72 w-full overflow-hidden rounded-xl border md:h-96">
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        <div className="space-y-5 text-lg leading-8 text-foreground/90">
          {post.content.map((paragraph, index) => (
            <p key={`${post.slug}-${index}`}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">Ready to build your virtual studio?</h2>
          <p className="mb-6 text-muted-foreground">Start free — no credit card required.</p>
          <a
            href="https://www.unytea.com/en#pricing"
            className="inline-block rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start Free
          </a>
        </div>

        <div className="flex gap-4 pt-8">
          <Link
            href={`/${locale}/blog`}
            className="text-sm font-medium text-primary hover:underline"
          >
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

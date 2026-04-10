import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "../posts";

type RouteParams = {
  locale: string;
  slug: string;
};

type Props = {
  params: Promise<RouteParams>;
};

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unytea.com";
  const canonicalUrl = `${appUrl}/${locale}/blog/${post.slug}`;

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unytea.com";
  const articleUrl = `${appUrl}/${locale}/blog/${post.slug}`;

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
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <p className="text-sm text-muted-foreground mb-3">Blog</p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {post.date} · {post.readTime} · {post.author}
        </p>

        <div className="relative h-72 md:h-96 w-full overflow-hidden rounded-xl border mb-8">
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

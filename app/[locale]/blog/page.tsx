import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllPosts } from "./posts";

export const metadata: Metadata = {
  title: "Blog | Unytea",
  description: "Insights and tactical guides for creators and community operators.",
  openGraph: {
    title: "Blog | Unytea",
    description: "Insights and tactical guides for creators and community operators.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Unytea",
    description: "Insights and tactical guides for creators and community operators.",
  },
};

export default function BlogPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <p className="text-sm text-muted-foreground mb-2">Resources</p>
          <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Insights and tactical guides for creators and community operators.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl space-y-6">
          {posts.map((post) => (
            <article key={post.slug} className="overflow-hidden rounded-xl border bg-card">
              <Link href={`/${locale}/blog/${post.slug}`} className="block">
                <div className="relative h-56 w-full">
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 896px"
                    className="object-cover"
                  />
                </div>
              </Link>

              <div className="p-6">
                <p className="text-xs text-muted-foreground mb-2">
                  {post.date} · {post.readTime} · {post.author}
                </p>
                <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <Link
                  href={`/${locale}/blog/${post.slug}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Read article →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="pt-10">
          <Link href={`/${locale}`} className="text-sm font-medium text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

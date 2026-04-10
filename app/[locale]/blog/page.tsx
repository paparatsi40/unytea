import Link from "next/link";
import { getAllPosts } from "./posts";

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
        <div className="max-w-4xl space-y-4">
          {posts.map((post) => (
            <article key={post.slug} className="rounded-xl border bg-card p-6">
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

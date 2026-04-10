export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  seoDescription: string;
  date: string;
  author: string;
  readTime: string;
  featuredImage: string;
  content: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "launch-community-that-converts",
    title: "How to Launch a Community That Converts",
    excerpt: "A practical framework to go from first members to repeat revenue.",
    seoDescription:
      "Learn a proven launch framework to turn new community members into active participants and paying customers.",
    date: "2026-04-09",
    author: "Unytea Team",
    readTime: "6 min read",
    featuredImage:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
    content: [
      "Most communities fail because they launch as content libraries instead of transformation engines.",
      "Start by defining one concrete outcome members should achieve in the first 30 days.",
      "Then create a weekly cadence: one live session, one tactical post, one member activation prompt.",
      "Measure conversion from visitor to member, and from member to active attendee. Optimize those two numbers first.",
    ],
  },
  {
    slug: "live-sessions-playbook-attendance",
    title: "Live Sessions Playbook for Higher Attendance",
    excerpt: "Simple structure and reminders that improve participation consistently.",
    seoDescription:
      "Increase session attendance with a reliable reminder cadence, clearer positioning, and post-session follow-through.",
    date: "2026-04-09",
    author: "Unytea Team",
    readTime: "5 min read",
    featuredImage:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80",
    content: [
      "Attendance is usually a messaging problem, not a demand problem.",
      "Announce sessions 7 days before, remind 24 hours before, and send a final reminder 15 minutes before start.",
      "Use session titles focused on outcomes, not topics.",
      "After each session, publish key takeaways and one next action to keep engagement high.",
    ],
  },
  {
    slug: "pricing-paid-access-without-killing-growth",
    title: "Pricing Paid Access Without Killing Growth",
    excerpt: "How to balance conversion, retention, and long-term trust.",
    seoDescription:
      "Set paid access pricing that protects growth, improves retention, and builds long-term trust in your community brand.",
    date: "2026-04-09",
    author: "Unytea Team",
    readTime: "7 min read",
    featuredImage:
      "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80",
    content: [
      "Early communities often underprice because they fear friction.",
      "A better strategy is a clear value ladder: free exploration, paid core offer, optional premium depth.",
      "Your pricing page must answer three questions: who it is for, what result it gives, and when users should upgrade.",
      "Track churn reasons monthly and update your offer before changing prices.",
    ],
  },
];

export function getAllPosts() {
  return BLOG_POSTS;
}

export function getPostBySlug(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

// app/[locale]/contact/metadata.ts
import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Contact Us",
  description: "Get in touch with Unytea. We're here to help with questions about mentorship, communities, or technical support.",
  keywords: [
    "contact",
    "support",
    "help",
    "customer service",
  ],
  path: "/contact",
});

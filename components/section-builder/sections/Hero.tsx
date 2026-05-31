"use client";

import Image from "next/image";
import { SectionSchema } from "../types";
import type { LandingCommunity } from "../types";

export const HeroRender = (props: Record<string, any>) => {
  const { title, subtitle, imageUrl, ctaLabel, ctaUrl } = props;
  const community = props.community as LandingCommunity | undefined;

  // Host-configured props take precedence; community data fills the gaps so
  // the same section works in the builder (no community) and on the live page.
  const coverUrl = imageUrl || community?.coverImageUrl || "";
  const logoUrl = community?.imageUrl || "";
  const heading = title || community?.name || "Welcome to our Community";
  const tagline = subtitle || community?.description || "";
  const ownerName = community?.owner?.name;
  const ownerImage = community?.owner?.image;
  const ownerTitle = community?.ownerTitle;
  const primary = community?.primaryColor || "#8B5CF6";
  const secondary = community?.secondaryColor || "#EC4899";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      {/* Cover */}
      <div className="relative h-48 w-full md:h-56">
        {coverUrl ? (
          <Image src={coverUrl} alt="" fill unoptimized sizes="100vw" className="object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ backgroundImage: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          />
        )}
        {/* Logo, overlapping the cover bottom-left */}
        <div className="absolute -bottom-8 left-6">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-gray-100 shadow-md md:h-20 md:w-20">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={heading}
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-400">
                {heading.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pb-6 pt-10">
        <h1 className="text-2xl font-medium text-gray-900 md:text-3xl">{heading}</h1>
        {ownerName && (
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {ownerImage && (
              <span className="relative inline-block h-5 w-5 overflow-hidden rounded-full bg-gray-200">
                <Image
                  src={ownerImage}
                  alt={ownerName}
                  fill
                  unoptimized
                  sizes="20px"
                  className="object-cover"
                />
              </span>
            )}
            <span>
              by {ownerName}
              {ownerTitle ? ` · ${ownerTitle}` : ""}
            </span>
          </div>
        )}
        {tagline && <p className="mt-3 line-clamp-3 text-sm text-gray-600 md:text-base">{tagline}</p>}
        {ctaLabel && (
          <a
            href={ctaUrl || "#"}
            className="mt-5 inline-block rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
};

export const HeroSchema: SectionSchema = {
  type: "hero",
  label: "Hero",
  description: "Cover image, community logo, owner, and CTA",
  icon: "🦸",
  defaultProps: {
    title: "",
    subtitle: "",
    imageUrl: "",
    ctaLabel: "Join Now",
    ctaUrl: "#",
    // alignment retained for backward-compat with existing landingLayout JSON;
    // the refactored cover layout no longer branches on it.
    alignment: "left",
  },
  fields: [
    { key: "title", label: "Title", kind: "text", placeholder: "Defaults to community name" },
    {
      key: "subtitle",
      label: "Subtitle",
      kind: "textarea",
      placeholder: "Defaults to community description",
    },
    { key: "imageUrl", label: "Cover Image (URL)", kind: "image", placeholder: "https://..." },
    { key: "ctaLabel", label: "Button Text", kind: "text", placeholder: "Join Now" },
    { key: "ctaUrl", label: "Button URL", kind: "url", placeholder: "https://..." },
  ],
  Render: HeroRender,
};

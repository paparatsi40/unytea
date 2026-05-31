"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionSchema } from "../types";
import type { LandingCommunity } from "../types";

export const OwnerBioRender = (props: Record<string, any>) => {
  const { title, name, role, bio, imageUrl, link1Label, link1Url, link2Label, link2Url } = props;
  const community = props.community as LandingCommunity | undefined;
  const t = useTranslations("community.landing.ownerBio");

  // Host-configured props win; community owner data fills the gaps.
  const displayName = name || community?.owner?.name || "Your Name";
  const displayRole = role || community?.ownerTitle || "";
  const avatar = imageUrl || community?.owner?.image || "";

  const links = [
    { label: link1Label, url: link1Url },
    { label: link2Label, url: link2Url },
  ].filter((l) => l.label && l.url);

  return (
    <section className="rounded-2xl border border-border bg-white p-8 md:p-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title || t("defaultTitle")}
        </h2>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 shadow-md">
            {avatar ? (
              <Image
                src={avatar}
                alt={displayName}
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-medium text-gray-900">{displayName}</h3>
            {displayRole && (
              <p className="mt-0.5 text-sm font-medium text-purple-600">{displayRole}</p>
            )}
            <p className="mt-3 whitespace-pre-line text-sm text-gray-700 md:text-base">
              {bio || "Share your story, expertise, and why you created this community..."}
            </p>

            {links.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-200 px-3 py-1.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const OwnerBioSchema: SectionSchema = {
  type: "ownerBio",
  label: "Owner Bio",
  description: "Introduce yourself to potential members",
  icon: "👤",
  defaultProps: {
    title: "About the host",
    name: "",
    role: "",
    bio: "Share your story here. Explain your background, expertise, and why you created this community. What unique value do you bring to members?",
    imageUrl: "",
    link1Label: "LinkedIn",
    link1Url: "",
    link2Label: "Twitter",
    link2Url: "",
  },
  fields: [
    { key: "title", label: "Title (optional)", kind: "text", placeholder: "About the host" },
    { key: "name", label: "Your Name", kind: "text", placeholder: "Defaults to community owner" },
    {
      key: "role",
      label: "Your Role/Title",
      kind: "text",
      placeholder: "Founder & Lead Instructor",
    },
    { key: "bio", label: "Bio", kind: "textarea", placeholder: "Your story..." },
    { key: "imageUrl", label: "Profile Image (URL)", kind: "image", placeholder: "https://..." },
    { key: "link1Label", label: "Link 1 Label", kind: "text", placeholder: "LinkedIn" },
    { key: "link1Url", label: "Link 1 URL", kind: "url", placeholder: "https://..." },
    { key: "link2Label", label: "Link 2 Label", kind: "text", placeholder: "Twitter" },
    { key: "link2Url", label: "Link 2 URL", kind: "url", placeholder: "https://..." },
  ],
  Render: OwnerBioRender,
};

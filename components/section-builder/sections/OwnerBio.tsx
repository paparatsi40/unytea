"use client";

import React from "react";
import { SectionSchema } from "../types";

export const OwnerBioRender = (props: Record<string, any>) => {
  const { title, name, role, bio, imageUrl, link1Label, link1Url, link2Label, link2Url } = props;
  
  const links = [
    { label: link1Label, url: link1Url },
    { label: link2Label, url: link2Url },
  ].filter(l => l.label && l.url);
  
  return (
    <section className="rounded-2xl border border-border bg-white p-8 md:p-16">
      <div className="mx-auto max-w-4xl">
        {title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              {title}
            </h2>
          </div>
        )}
        
        <div className="grid gap-8 md:grid-cols-[300px_1fr] md:items-start">
          <div className="mx-auto md:mx-0">
            <div className="h-64 w-64 overflow-hidden rounded-2xl bg-gray-100 shadow-xl">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name || "Owner"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <svg className="h-24 w-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {name || "Your Name"}
            </h3>
            {role && (
              <p className="mt-2 text-lg font-semibold text-purple-600">
                {role}
              </p>
            )}
            <p className="mt-4 text-base text-gray-700 whitespace-pre-line md:text-lg">
              {bio || "Share your story, expertise, and why you created this community..."}
            </p>
            
            {links.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
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
    title: "Meet Your Host",
    name: "Your Name",
    role: "Founder & Lead Instructor",
    bio: "Share your story here. Explain your background, expertise, and why you created this community. What unique value do you bring to members?",
    imageUrl: "",
    link1Label: "LinkedIn",
    link1Url: "",
    link2Label: "Twitter",
    link2Url: "",
  },
  fields: [
    { key: "title", label: "Title (optional)", kind: "text", placeholder: "Meet Your Host" },
    { key: "name", label: "Your Name", kind: "text", placeholder: "John Doe" },
    { key: "role", label: "Your Role/Title", kind: "text", placeholder: "Founder & Lead Instructor" },
    { key: "bio", label: "Bio", kind: "textarea", placeholder: "Your story..." },
    { key: "imageUrl", label: "Profile Image (URL)", kind: "image", placeholder: "https://..." },
    { key: "link1Label", label: "Link 1 Label", kind: "text", placeholder: "LinkedIn" },
    { key: "link1Url", label: "Link 1 URL", kind: "url", placeholder: "https://..." },
    { key: "link2Label", label: "Link 2 Label", kind: "text", placeholder: "Twitter" },
    { key: "link2Url", label: "Link 2 URL", kind: "url", placeholder: "https://..." },
  ],
  Render: OwnerBioRender,
};

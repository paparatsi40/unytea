"use client";

import React from "react";
import { SectionSchema } from "../types";

export const HeroRender = (props: Record<string, any>) => {
  const { title, subtitle, imageUrl, ctaLabel, ctaUrl, alignment = "left" } = props;
  
  const isLeft = alignment === "left";
  
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-purple-50 to-white p-8 md:p-16">
      <div className={`grid gap-8 md:grid-cols-2 md:items-center ${!isLeft ? "md:flex-row-reverse" : ""}`}>
        <div className={isLeft ? "md:order-1" : "md:order-2"}>
          <h1 className="text-3xl font-bold text-gray-900 md:text-5xl lg:text-6xl">
            {title || "Welcome to our Community"}
          </h1>
          <p className="mt-4 text-base text-gray-600 md:text-lg lg:text-xl">
            {subtitle || "Join thousands of members learning and growing together"}
          </p>
          {ctaLabel && (
            <a
              href={ctaUrl || "#"}
              className="mt-6 inline-block rounded-lg bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-purple-700 hover:shadow-xl md:text-lg"
            >
              {ctaLabel}
            </a>
          )}
        </div>
        <div className={`${isLeft ? "md:order-2" : "md:order-1"}`}>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100 shadow-2xl">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Hero"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="mx-auto h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Add hero image</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const HeroSchema: SectionSchema = {
  type: "hero",
  label: "Hero",
  description: "Eye-catching hero section with title, subtitle, image, and CTA",
  icon: "🦸",
  defaultProps: {
    title: "Welcome to Our Community",
    subtitle: "Join thousands of members learning and growing together",
    imageUrl: "",
    ctaLabel: "Join Now",
    ctaUrl: "#",
    alignment: "left",
  },
  fields: [
    { key: "title", label: "Title", kind: "text", placeholder: "Main headline" },
    { key: "subtitle", label: "Subtitle", kind: "textarea", placeholder: "Supporting text" },
    { key: "imageUrl", label: "Hero Image (URL)", kind: "image", placeholder: "https://..." },
    { key: "ctaLabel", label: "Button Text", kind: "text", placeholder: "Join Now" },
    { key: "ctaUrl", label: "Button URL", kind: "url", placeholder: "https://..." },
    { 
      key: "alignment", 
      label: "Image Position", 
      kind: "select", 
      options: ["left", "right"] 
    },
  ],
  Render: HeroRender,
};

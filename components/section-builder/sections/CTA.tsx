"use client";

import React from "react";
import { SectionSchema } from "../types";

export const CTARender = (props: Record<string, any>) => {
  const { title, subtitle, ctaLabel, ctaUrl, backgroundColor = "purple" } = props;
  
  const bgColors: Record<string, string> = {
    purple: "from-purple-600 to-fuchsia-500",
    blue: "from-blue-600 to-cyan-500",
    green: "from-green-600 to-emerald-500",
    orange: "from-orange-600 to-red-500",
  };
  
  return (
    <section className={`rounded-2xl border border-border bg-gradient-to-br ${bgColors[backgroundColor] || bgColors.purple} p-8 text-white md:p-16`}>
      <div className="mx-auto max-w-3xl text-center">
        <h3 className="text-3xl font-bold md:text-4xl lg:text-5xl">
          {title || "Ready to Join?"}
        </h3>
        <p className="mt-4 text-lg text-white/90 md:text-xl">
          {subtitle || "Take the next step today"}
        </p>
        {ctaLabel && (
          <a
            href={ctaUrl || "#"}
            className="mt-8 inline-block rounded-lg bg-white px-8 py-4 text-lg font-semibold text-purple-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
};

export const CTASchema: SectionSchema = {
  type: "cta",
  label: "Call to Action",
  description: "Prominent CTA section to drive conversions",
  icon: "📣",
  defaultProps: {
    title: "Ready to Join?",
    subtitle: "Take the next step and become part of our community today",
    ctaLabel: "Get Started",
    ctaUrl: "#",
    backgroundColor: "purple",
  },
  fields: [
    { key: "title", label: "Title", kind: "text", placeholder: "Ready to Join?" },
    { key: "subtitle", label: "Subtitle", kind: "textarea", placeholder: "Supporting text" },
    { key: "ctaLabel", label: "Button Text", kind: "text", placeholder: "Get Started" },
    { key: "ctaUrl", label: "Button URL", kind: "url", placeholder: "https://..." },
    { 
      key: "backgroundColor", 
      label: "Background Color", 
      kind: "select", 
      options: ["purple", "blue", "green", "orange"] 
    },
  ],
  Render: CTARender,
};

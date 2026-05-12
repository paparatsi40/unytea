"use client";

import { SectionSchema } from "../types";

export const FeaturesRender = (props: Record<string, any>) => {
  const { title, subtitle, items = [] } = props;
  
  // Parse items from CSV if needed
  const featureItems = Array.isArray(items)
    ? items
    : String(props.itemsCsv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  
  return (
    <section className="rounded-2xl border border-border bg-white p-8 md:p-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
          {title || "What You'll Get"}
        </h2>
        {subtitle && (
          <p className="mt-3 text-lg text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featureItems.map((item: string, i: number) => (
          <div 
            key={i} 
            className="group rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 transition-all hover:border-purple-300 hover:shadow-lg"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl group-hover:bg-purple-200">
              ✨
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {item || `Feature ${i + 1}`}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Description of this amazing feature
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export const FeaturesSchema: SectionSchema = {
  type: "features",
  label: "Features",
  description: "Grid of features with icons and descriptions",
  icon: "⭐",
  defaultProps: {
    title: "What You'll Get",
    subtitle: "Everything you need to succeed",
    items: ["Exclusive Resources", "Live Events", "Expert Mentorship", "Community Support", "Course Library", "Networking"],
    itemsCsv: "Exclusive Resources, Live Events, Expert Mentorship, Community Support, Course Library, Networking",
  },
  fields: [
    { key: "title", label: "Title", kind: "text", placeholder: "What You'll Get" },
    { key: "subtitle", label: "Subtitle", kind: "text", placeholder: "Supporting text" },
    { 
      key: "itemsCsv", 
      label: "Features (comma-separated)", 
      kind: "textarea", 
      placeholder: "Feature 1, Feature 2, Feature 3" 
    },
  ],
  Render: FeaturesRender,
};

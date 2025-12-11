"use client";

import React from "react";
import { SectionSchema } from "../types";

export const StatsRender = (props: Record<string, any>) => {
  const { title, stat1Value, stat1Label, stat2Value, stat2Label, stat3Value, stat3Label, stat4Value, stat4Label } = props;
  
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
    { value: stat4Value, label: stat4Label },
  ].filter(s => s.value);
  
  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-purple-600 to-fuchsia-500 p-8 text-white md:p-16">
      <div className="text-center mb-12">
        {title && (
          <h2 className="text-3xl font-bold md:text-4xl">
            {title}
          </h2>
        )}
      </div>
      
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-bold md:text-5xl lg:text-6xl">
              {stat.value}
            </div>
            <div className="mt-2 text-lg text-white/90 md:text-xl">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const StatsSchema: SectionSchema = {
  type: "stats",
  label: "Stats",
  description: "Impressive numbers and achievements",
  icon: "📊",
  defaultProps: {
    title: "Our Impact",
    stat1Value: "10,000+",
    stat1Label: "Active Members",
    stat2Value: "500+",
    stat2Label: "Courses",
    stat3Value: "100K+",
    stat3Label: "Posts",
    stat4Value: "50+",
    stat4Label: "Countries",
  },
  fields: [
    { key: "title", label: "Title (optional)", kind: "text", placeholder: "Our Impact" },
    { key: "stat1Value", label: "Stat 1 Value", kind: "text", placeholder: "10,000+" },
    { key: "stat1Label", label: "Stat 1 Label", kind: "text", placeholder: "Members" },
    { key: "stat2Value", label: "Stat 2 Value", kind: "text", placeholder: "500+" },
    { key: "stat2Label", label: "Stat 2 Label", kind: "text", placeholder: "Courses" },
    { key: "stat3Value", label: "Stat 3 Value", kind: "text", placeholder: "100K+" },
    { key: "stat3Label", label: "Stat 3 Label", kind: "text", placeholder: "Posts" },
    { key: "stat4Value", label: "Stat 4 Value", kind: "text", placeholder: "50+" },
    { key: "stat4Label", label: "Stat 4 Label", kind: "text", placeholder: "Countries" },
  ],
  Render: StatsRender,
};

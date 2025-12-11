"use client";

import React from "react";
import { SectionSchema } from "../types";

export const TestimonialsRender = (props: Record<string, any>) => {
  const { title, testimonial1, author1, role1, testimonial2, author2, role2, testimonial3, author3, role3 } = props;
  
  const testimonials = [
    { quote: testimonial1, author: author1, role: role1 },
    { quote: testimonial2, author: author2, role: role2 },
    { quote: testimonial3, author: author3, role: role3 },
  ].filter(t => t.quote);
  
  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-purple-50 to-white p-8 md:p-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
          {title || "What Members Say"}
        </h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <div key={i} className="rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 text-4xl text-purple-600">"</div>
            <p className="mb-4 text-sm text-gray-700 italic">
              {t.quote}
            </p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-200" />
              <div>
                <div className="text-sm font-semibold text-gray-900">{t.author}</div>
                <div className="text-xs text-gray-600">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const TestimonialsSchema: SectionSchema = {
  type: "testimonials",
  label: "Testimonials",
  description: "Social proof from happy members",
  icon: "💬",
  defaultProps: {
    title: "What Members Say",
    testimonial1: "This community changed my life! The support and resources are incredible.",
    author1: "Sarah Johnson",
    role1: "Member since 2023",
    testimonial2: "Best investment I've ever made. The networking alone is worth it.",
    author2: "Mike Chen",
    role2: "Premium Member",
    testimonial3: "I've learned more here in 3 months than in 3 years on my own.",
    author3: "Emma Davis",
    role3: "Active Member",
  },
  fields: [
    { key: "title", label: "Title", kind: "text", placeholder: "What Members Say" },
    { key: "testimonial1", label: "Testimonial 1", kind: "textarea", placeholder: "First testimonial" },
    { key: "author1", label: "Author 1", kind: "text", placeholder: "Name" },
    { key: "role1", label: "Role 1", kind: "text", placeholder: "Title/Role" },
    { key: "testimonial2", label: "Testimonial 2", kind: "textarea", placeholder: "Second testimonial" },
    { key: "author2", label: "Author 2", kind: "text", placeholder: "Name" },
    { key: "role2", label: "Role 2", kind: "text", placeholder: "Title/Role" },
    { key: "testimonial3", label: "Testimonial 3", kind: "textarea", placeholder: "Third testimonial" },
    { key: "author3", label: "Author 3", kind: "text", placeholder: "Name" },
    { key: "role3", label: "Role 3", kind: "text", placeholder: "Title/Role" },
  ],
  Render: TestimonialsRender,
};

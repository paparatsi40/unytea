"use client";

import { Star, Quote } from "lucide-react";
import Image from "next/image";

interface Testimonial {
  id: string;
  content: string;
  author: {
    name: string;
    image?: string;
    role?: string;
  };
  rating?: number;
}

interface TestimonialsSectionProps {
  title?: string;
  testimonials: Testimonial[];
  theme?: {
    primaryColor: string;
  };
}

export function TestimonialsSection({
  title = "What Members Say",
  testimonials,
  theme,
}: TestimonialsSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-8 text-center text-2xl font-bold" style={{ color: primaryColor }}>
        {title}
      </h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="relative rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <Quote className="mb-4 h-8 w-8 opacity-20" style={{ color: primaryColor }} />

            <p className="mb-6 text-gray-700">{testimonial.content}</p>

            {testimonial.rating && (
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < testimonial.rating! ? "fill-current" : ""}`}
                    style={{
                      color: i < testimonial.rating! ? primaryColor : "#d1d5db",
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              {testimonial.author.image && (
                <Image
                  src={testimonial.author.image}
                  alt={testimonial.author.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              <div>
                <div className="font-medium text-gray-900">{testimonial.author.name}</div>
                {testimonial.author.role && (
                  <div className="text-sm text-gray-500">{testimonial.author.role}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

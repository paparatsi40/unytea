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
      <h2 
        className="text-2xl font-bold mb-8 text-center"
        style={{ color: primaryColor }}
      >
        {title}
      </h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative"
          >
            <Quote 
              className="h-8 w-8 mb-4 opacity-20"
              style={{ color: primaryColor }}
            />
            
            <p className="text-gray-700 mb-6">
              {testimonial.content}
            </p>

            {testimonial.rating && (
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating! 
                        ? 'fill-current' 
                        : ''
                    }`}
                    style={{ 
                      color: i < testimonial.rating! 
                        ? primaryColor 
                        : '#d1d5db' 
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
                <div className="font-medium text-gray-900">
                  {testimonial.author.name}
                </div>
                {testimonial.author.role && (
                  <div className="text-sm text-gray-500">
                    {testimonial.author.role}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
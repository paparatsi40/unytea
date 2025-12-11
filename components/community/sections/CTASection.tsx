"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  title: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function CTASection({
  title,
  description,
  buttonText,
  buttonLink,
  theme,
}: CTASectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";
  const secondaryColor = theme?.secondaryColor || "#06b6d4";

  return (
    <section 
      className="rounded-2xl p-12 text-center text-white"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
      }}
    >
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        {title}
      </h2>
      
      {description && (
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          {description}
        </p>
      )}

      <Button
        size="lg"
        className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg"
        asChild
      >
        <a href={buttonLink}>
          {buttonText}
          <ArrowRight className="ml-2 h-5 w-5" />
        </a>
      </Button>
    </section>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  logoUrl?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function HeroSection({
  title,
  subtitle,
  ctaText = "Join Community",
  ctaLink = "#",
  backgroundImage,
  logoUrl,
  theme,
}: HeroSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";
  const secondaryColor = theme?.secondaryColor || "#06b6d4";

  return (
    <section 
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: backgroundImage 
          ? `url(${backgroundImage})` 
          : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
      }}
    >
      {/* Overlay */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Content */}
      <div className="relative px-8 py-16 md:py-24 text-center">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-6 flex justify-center">
            <div className="relative h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm p-4">
              <Image
                src={logoUrl}
                alt="Community Logo"
                fill
                className="object-contain rounded-full"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}

        {/* CTA */}
        {ctaText && (
          <Button
            size="lg"
            className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg"
            asChild
          >
            <a href={ctaLink}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
    </section>
  );
}
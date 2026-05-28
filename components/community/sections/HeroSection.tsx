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
          : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
      }}
    >
      {/* Overlay */}
      {backgroundImage && <div className="absolute inset-0 bg-black/40" />}

      {/* Content */}
      <div className="relative px-8 py-16 text-center md:py-24">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-6 flex justify-center">
            <div className="relative h-24 w-24 rounded-full bg-white/10 p-4 backdrop-blur-sm">
              <Image
                src={logoUrl}
                alt="Community Logo"
                fill
                className="rounded-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold text-white md:text-6xl">{title}</h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="mx-auto mb-8 max-w-2xl text-xl text-white/90 md:text-2xl">{subtitle}</p>
        )}

        {/* CTA */}
        {ctaText && (
          <Button
            size="lg"
            className="bg-white px-8 py-6 text-lg text-gray-900 hover:bg-gray-100"
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
      <div className="absolute left-0 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
    </section>
  );
}

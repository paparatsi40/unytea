"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, MessageSquare, BookOpen, ArrowRight, Sparkles } from "lucide-react";

interface FeaturedCommunityCardProps {
  community: {
    name: string;
    category: string;
    members: number;
    color: string;
    image: string;
    description: string;
  };
  locale: string;
}

export function FeaturedCommunityCard({ community, locale }: FeaturedCommunityCardProps) {
  const [is3D, setIs3D] = useState(false);

  return (
    <Link
      href={`/${locale}/dashboard/communities`}
      className="group relative flex-shrink-0 w-80 snap-center"
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      <div 
        className="relative overflow-hidden rounded-2xl border-2 border-border bg-card shadow-xl transition-all duration-500 hover:border-primary hover:shadow-2xl"
        style={{
          transform: is3D ? 'translateZ(20px) rotateY(5deg) rotateX(-5deg)' : 'translateZ(0) rotateY(0deg) rotateX(0deg)',
          transition: 'transform 0.5s ease, box-shadow 0.5s ease',
        }}
        onMouseEnter={() => setIs3D(true)}
        onMouseLeave={() => setIs3D(false)}
      >
        {/* Image Cover with Overlay */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={community.image}
            alt={community.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Floating Badge */}
          <div className="absolute top-4 right-4 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-lg">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{community.members.toLocaleString()}</span>
            </div>
          </div>

          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <span className={`inline-block rounded-full bg-gradient-to-r ${community.color} px-3 py-1 text-xs font-bold text-white shadow-lg`}>
              {community.category}
            </span>
          </div>

          {/* Title on Image */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-2xl font-bold text-white drop-shadow-lg group-hover:scale-105 transition-transform">
              {community.name}
            </h3>
          </div>
        </div>

        {/* Content Card */}
        <div className="p-6 bg-gradient-to-b from-card to-card/50">
          <p className="text-base text-muted-foreground mb-4 line-clamp-2">
            {community.description}
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>Free</span>
              </div>
            </div>
            
            {/* Explore Button */}
            <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
              <span className="text-sm">Explore</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${community.color} rounded-full transition-all duration-1000 group-hover:w-full`}
                  style={{ width: '60%' }}
                />
              </div>
              <Sparkles className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Shine Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        </div>
      </div>
    </Link>
  );
}

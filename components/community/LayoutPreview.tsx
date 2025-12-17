"use client";

import { Check } from "lucide-react";
import React from 'react';

interface LayoutPreviewProps {
  type: string;
  name: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

// Layout configuration
const LAYOUTS = [
  {
    type: 'MODERN_GRID',
    name: 'Visual Grid',
    description: 'Pinterest-style masonry layout perfect for visual content, portfolios, and design communities'
  },
  {
    type: 'CLASSIC_FORUM',
    name: 'Discussion Forum',
    description: 'Traditional forum layout with threaded discussions, ideal for Q&A and long-form conversations'
  },
  {
    type: 'ACADEMY',
    name: 'Learning Hub',
    description: 'Course-focused layout with progress tracking, perfect for educational communities and cohorts'
  },
  {
    type: 'SOCIAL_HUB',
    name: 'Social Feed',
    description: 'Instagram/Facebook-style feed with stories and member highlights, great for engagement'
  },
  {
    type: 'DASHBOARD',
    name: 'Analytics Dashboard',
    description: 'Data-driven layout with charts and metrics, ideal for business and professional communities'
  },
  {
    type: 'MINIMALIST',
    name: 'Clean & Simple',
    description: 'Notion-style minimal design focused on content and readability, perfect for writers'
  },
];

// Main selector component
export function LayoutPreview({ community, setCommunity }: { 
  community: any; 
  setCommunity: (updater: (prev: any) => any) => void; 
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
      {LAYOUTS.map((layout) => (
        <LayoutCard
          key={layout.type}
          type={layout.type}
          name={layout.name}
          description={layout.description}
          isSelected={community.layoutType === layout.type || (!community.layoutType && layout.type === 'MODERN_GRID')}
          onClick={() => setCommunity(prev => prev ? { ...prev, layoutType: layout.type } : null)}
        />
      ))}
    </div>
  );
}

// Individual layout card
function LayoutCard({ type, name, description, isSelected, onClick }: LayoutPreviewProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border-2 p-6 text-left transition-all hover:border-primary/50 hover:shadow-xl ${
        isSelected
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-border bg-card hover:bg-accent/20'
      }`}
    >
      {/* Preview Mockup */}
      <div className="aspect-video rounded-xl overflow-hidden mb-4 shadow-md border border-border/50">
        {type === 'MODERN_GRID' && <ModernGridPreview />}
        {type === 'CLASSIC_FORUM' && <ClassicForumPreview />}
        {type === 'ACADEMY' && <AcademyPreview />}
        {type === 'DASHBOARD' && <DashboardPreview />}
        {type === 'MINIMALIST' && <MinimalistPreview />}
        {type === 'SOCIAL_HUB' && <SocialHubPreview />}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-foreground text-lg">{name}</p>
            {isSelected && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                <Check className="h-3 w-3" />
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          ACTIVE
        </div>
      )}
    </button>
  );
}

// Modern Grid Preview
function ModernGridPreview() {
  return (
    <div className="h-full bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-purple-500/20 p-3">
      <div className="grid grid-cols-3 gap-2 h-full">
        {/* Large featured card */}
        <div className="col-span-2 row-span-2 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-sm overflow-hidden">
          <div className="h-2/3 bg-gradient-to-br from-purple-400 to-pink-400"></div>
          <div className="p-2 space-y-1">
            <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded w-3/4"></div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          </div>
        </div>
        
        {/* Small cards */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm overflow-hidden">
            <div className="h-12 bg-gradient-to-br from-purple-300 to-pink-300"></div>
            <div className="p-1.5 space-y-1">
              <div className="h-1 bg-slate-300 dark:bg-slate-600 rounded w-2/3"></div>
              <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Classic Forum Preview
function ClassicForumPreview() {
  return (
    <div className="h-full bg-gradient-to-br from-blue-500/20 via-cyan-500/15 to-blue-500/20 p-3">
      <div className="space-y-2 h-full">
        {/* Header */}
        <div className="h-8 rounded-lg bg-blue-500/30 flex items-center px-3 gap-2">
          <div className="h-4 w-4 rounded-full bg-white/40"></div>
          <div className="h-2 bg-white/50 rounded w-24"></div>
        </div>
        
        {/* Forum threads */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm p-2 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400"></div>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-2/3"></div>
              <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
            <div className="flex gap-1">
              <div className="h-6 w-8 rounded bg-slate-200 dark:bg-slate-700"></div>
              <div className="h-6 w-8 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Academy Preview
function AcademyPreview() {
  return (
    <div className="h-full bg-gradient-to-br from-green-500/20 via-emerald-500/15 to-green-500/20 p-3">
      <div className="space-y-2 h-full">
        {/* Hero Section */}
        <div className="h-12 rounded-lg bg-gradient-to-r from-green-400 to-emerald-400 p-2 flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <div className="h-2 bg-white/70 rounded w-1/2"></div>
            <div className="h-1.5 bg-white/50 rounded w-1/3"></div>
          </div>
          <div className="h-6 w-16 rounded bg-white/80"></div>
        </div>
        
        {/* Course Grid */}
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm overflow-hidden">
              <div className="h-16 bg-gradient-to-br from-green-300 to-emerald-300 relative">
                <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-white/80"></div>
              </div>
              <div className="p-1.5 space-y-1">
                <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-3/4"></div>
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="flex gap-1 mt-1">
                  <div className="h-1 bg-green-400 rounded w-2/3"></div>
                  <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dashboard Preview
function DashboardPreview() {
  return (
    <div className="h-full bg-gradient-to-br from-orange-500/20 via-red-500/15 to-orange-500/20 p-3">
      <div className="space-y-2 h-full">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm p-2 text-center">
              <div className="h-4 w-4 rounded-full bg-gradient-to-br from-orange-400 to-red-400 mx-auto mb-1"></div>
              <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded w-2/3 mx-auto"></div>
            </div>
          ))}
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm p-2">
          <div className="flex items-end justify-around h-full gap-1 pb-2">
            {[60, 80, 70, 90, 75, 85, 65].map((height, i) => (
              <div 
                key={i}
                className="bg-gradient-to-t from-orange-400 to-red-400 rounded-t w-full"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="space-y-1">
          {[1, 2].map((i) => (
            <div key={i} className="rounded bg-white/60 dark:bg-slate-800/60 p-1.5 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-400"></div>
              <div className="h-1 bg-slate-300 dark:bg-slate-600 rounded flex-1"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Minimalist Preview
function MinimalistPreview() {
  return (
    <div className="h-full bg-gradient-to-br from-gray-500/20 via-slate-500/15 to-gray-500/20 p-4">
      <div className="space-y-3 h-full">
        {/* Clean Header */}
        <div className="space-y-1">
          <div className="h-3 bg-slate-800 dark:bg-slate-200 rounded w-1/3"></div>
          <div className="h-1.5 bg-slate-600 dark:bg-slate-400 rounded w-2/3"></div>
        </div>
        
        {/* Content Blocks */}
        <div className="space-y-2 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-2 border-slate-400 dark:border-slate-500 pl-3 py-1 space-y-1">
              <div className="h-1.5 bg-slate-700 dark:bg-slate-300 rounded w-1/2"></div>
              <div className="h-1 bg-slate-500 dark:bg-slate-500 rounded w-full"></div>
              <div className="h-1 bg-slate-500 dark:bg-slate-500 rounded w-4/5"></div>
            </div>
          ))}
        </div>
        
        {/* Minimal Footer */}
        <div className="flex gap-2 pt-2 border-t border-slate-300 dark:border-slate-600">
          <div className="h-5 w-16 rounded bg-slate-700 dark:bg-slate-300"></div>
          <div className="h-5 w-16 rounded bg-slate-300 dark:bg-slate-600"></div>
        </div>
      </div>
    </div>
  );
}

// Social Hub Preview (NEW)
function SocialHubPreview() {
  return (
    <div className="h-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-violet-500/20 p-3">
      <div className="grid grid-cols-3 gap-2 h-full">
        {/* Left Sidebar - Members */}
        <div className="space-y-1.5">
          <div className="h-4 rounded bg-violet-500/30 flex items-center px-1.5">
            <div className="h-1.5 bg-white/60 rounded w-2/3"></div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-white/70 dark:bg-slate-800/70 p-1.5 flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400"></div>
              <div className="space-y-0.5 flex-1">
                <div className="h-1 bg-slate-300 dark:bg-slate-600 rounded w-full"></div>
                <div className="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Main Feed */}
        <div className="col-span-2 space-y-1.5">
          {/* Story Row */}
          <div className="flex gap-1.5 mb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-400 border-2 border-white dark:border-slate-700"></div>
            ))}
          </div>
          
          {/* Posts */}
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm p-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400"></div>
                <div className="h-1 bg-slate-300 dark:bg-slate-600 rounded w-1/4"></div>
              </div>
              <div className="h-12 rounded bg-gradient-to-br from-violet-200 to-fuchsia-200 mb-1.5"></div>
              <div className="flex gap-2">
                <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-700"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Wrapper to render all layouts for preview/testing
export function LayoutSelectorPreviewWrapper() {
  // Dummy state for preview
  const [community, setCommunity] = React.useState({ layoutType: 'MODERN_GRID' });
  return (
    <LayoutPreview community={community} setCommunity={setCommunity} />
  );
}
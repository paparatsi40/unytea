"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function CommunitySelector() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetch user's communities
    async function fetchCommunities() {
      try {
        const response = await fetch("/api/communities");
        if (response.ok) {
          const data = await response.json();
          setCommunities(data.communities || []);
        }
      } catch (error) {
        console.error("Failed to fetch communities:", error);
      }
    }

    fetchCommunities();
  }, []);

  const handleSelect = (communityId: string) => {
    setSelected(communityId);
    setIsOpen(false);
    // Navigate to community-specific analytics
    window.location.href = `/dashboard/analytics/${communityId}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        <span>
          {selected
            ? communities.find((c) => c.id === selected)?.name || "Select Community"
            : "All Communities"}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && communities.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card shadow-lg">
          <div className="p-2">
            <button
              onClick={() => {
                setSelected(null);
                setIsOpen(false);
                window.location.href = "/dashboard/analytics";
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              All Communities
            </button>
            {communities.map((community) => (
              <button
                key={community.id}
                onClick={() => handleSelect(community.id)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                {community.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
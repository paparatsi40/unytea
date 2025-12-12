"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Crown, Users, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface Community {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  ownerId: string;
}

interface CommunitySwitcherProps {
  currentCommunityId: string;
  userId: string;
}

export function CommunitySwitcher({ currentCommunityId, userId }: CommunitySwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, [currentCommunityId, userId]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/communities/user-communities`);
      const data = await response.json();
      
      if (data.success) {
        const allCommunities = [
          ...(data.ownedCommunities || []),
          ...(data.joinedCommunities || [])
        ];
        setCommunities(allCommunities);
        
        const current = allCommunities.find((c: Community) => c.id === currentCommunityId);
        setCurrentCommunity(current || null);
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = (communityId: string) => {
    setIsOpen(false);
    router.push(`/dashboard/communities/${communityId}`);
  };

  const handleBackToDashboard = () => {
    setIsOpen(false);
    router.push("/dashboard");
  };

  const isOwner = currentCommunity?.ownerId === userId;

  if (loading || !currentCommunity) {
    return (
      <div className="px-3 pt-4 pb-2">
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="relative px-3 pt-4 pb-2">
      {/* Current Community Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 bg-accent/50 hover:bg-accent border border-border/50 hover:border-primary/50"
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 flex-shrink-0">
            <span className="text-sm font-bold text-white">
              {currentCommunity.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-foreground truncate">
                {currentCommunity.name}
              </span>
              {isOwner && (
                <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {communities.length} {communities.length === 1 ? 'community' : 'communities'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute left-3 right-3 top-full mt-2 z-50 rounded-lg border border-border bg-card shadow-lg max-h-[400px] overflow-y-auto">
            {/* Back to Dashboard */}
            <button
              onClick={handleBackToDashboard}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent border-b border-border"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Home className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-foreground">All Communities</span>
                <p className="text-xs text-muted-foreground">Back to dashboard</p>
              </div>
            </button>

            {/* Communities List */}
            <div className="py-2">
              {communities.map((community) => {
                const isCurrent = community.id === currentCommunityId;
                const isOwned = community.ownerId === userId;

                return (
                  <button
                    key={community.id}
                    onClick={() => !isCurrent && handleSwitch(community.id)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors",
                      isCurrent
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground"
                    )}
                    disabled={isCurrent}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="text-sm font-bold">
                        {community.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center space-x-2">
                        <span className={cn("truncate", isCurrent && "font-semibold")}>
                          {community.name}
                        </span>
                        {isOwned && (
                          <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{community.memberCount || 0} members</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="flex h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

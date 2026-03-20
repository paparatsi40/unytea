"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserIdentitySnapshot } from "@/app/actions/dashboard";

interface UserIdentitySnapshot {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    username: string | null;
    bio: string | null;
    tagline: string | null;
    interests: string[];
    skills: string[];
    location: string | null;
  };
  stats: {
    communitiesJoined: number;
    sessionsAttended: number;
    sessionsHosted: number;
    contributions: number;
  };
  communities: Array<{
    membershipId: string;
    role: string;
    community: {
      name: string;
      slug: string;
      membersCount: number;
      isPaid: boolean;
    };
  }>;
}

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const [identity, setIdentity] = useState<UserIdentitySnapshot | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getUserIdentitySnapshot(12);
      if (!active || !result.success || !result.identity) return;
      setIdentity(result.identity as UserIdentitySnapshot);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="mb-8 flex items-center space-x-6">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="h-24 w-24 rounded-full border-4 border-border object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-border bg-gradient-to-br from-purple-500 to-pink-500">
              <UserIcon className="h-12 w-12 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-foreground">{identity?.user.name || user.name || "User"}</h2>
            <p className="text-muted-foreground">{identity?.user.username ? `@${identity.user.username}` : user.email}</p>
            {(identity?.user.tagline || identity?.user.bio) && (
              <p className="mt-2 text-sm text-muted-foreground">{identity?.user.tagline || identity?.user.bio}</p>
            )}
          </div>
        </div>

        {identity && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">Communities</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{identity.stats.communitiesJoined}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">Sessions attended</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{identity.stats.sessionsAttended}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">Sessions hosted</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{identity.stats.sessionsHosted}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">Contributions</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{identity.stats.contributions}</p>
            </div>
          </div>
        )}

        {identity && identity.user.interests.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Interests</p>
            <div className="flex flex-wrap gap-2">
              {identity.user.interests.slice(0, 8).map((interest) => (
                <Badge key={interest} variant="outline">{interest}</Badge>
              ))}
            </div>
          </div>
        )}

        {identity && identity.communities.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Your communities</p>
              <Link href="/dashboard/communities">
                <Button variant="ghost" size="sm">Open communities</Button>
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {identity.communities.slice(0, 6).map((membership) => (
                <Link
                  key={membership.membershipId}
                  href={`/dashboard/c/${membership.community.slug}`}
                  className="rounded-lg border border-border bg-background p-3 hover:bg-muted/40"
                >
                  <p className="font-medium text-foreground">{membership.community.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {membership.community.membersCount} members · {membership.role} · {membership.community.isPaid ? "Paid" : "Free"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

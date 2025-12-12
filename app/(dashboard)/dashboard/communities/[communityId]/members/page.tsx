import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, Crown, Shield, UserPlus, Search } from "lucide-react";
import Image from "next/image";

export default async function CommunityMembersPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community with owner using Prisma
  const community = await prisma.community.findUnique({
    where: { id: params.communityId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!community) {
    redirect("/dashboard");
  }

  // Check if user is owner or member
  const isOwner = community.ownerId === session.user.id;

  // Fetch community members using Prisma
  const members = await prisma.member.findMany({
    where: { communityId: params.communityId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          username: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const membersList = members.map(m => m.user).filter(Boolean);
  const totalMembers = membersList.length + 1; // +1 for owner

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {community.name} - Members
              </h1>
              <p className="text-muted-foreground">
                {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        </div>

        {/* Only owners can invite for now */}
        {isOwner && (
          <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            <UserPlus className="h-4 w-4" />
            Invite Members
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members..."
          className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Owner Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Owner
        </h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {community.owner.image ? (
                <img
                  src={community.owner.image}
                  alt={community.owner.name}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {community.owner.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {community.owner.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">
                    <Crown className="h-3 w-3" />
                    Owner
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {community.owner.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members Section */}
      {membersList.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Members ({membersList.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {membersList.map((member: any) => (
              <div
                key={member.id}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="h-10 w-10 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {member.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  {isOwner && (
                    <button className="text-muted-foreground hover:text-foreground transition-colors ml-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    Member
                  </span>
                  {member.username && (
                    <span>@{member.username}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Members */}
      {membersList.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            No members yet
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {isOwner 
              ? "Invite people to join your community" 
              : "Be patient, members will join soon!"}
          </p>
          {isOwner && (
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <UserPlus className="h-4 w-4" />
              Invite Members
            </button>
          )}
        </div>
      )}
    </div>
  );
}

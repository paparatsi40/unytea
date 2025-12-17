import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { currentUserIsAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";
import { Building2, Users, MessageSquare, Eye, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function AdminCommunitiesPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isAdmin = await currentUserIsAdmin();
  
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const search = searchParams.search || "";

  // Build where clause
  const where: any = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get communities
  const communities = await prisma.community.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      description: true,
      image: true,
      slug: true,
      visibility: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      _count: {
        select: {
          members: true,
          posts: true,
          courses: true,
        },
      },
    },
  });

  const totalCommunities = await prisma.community.count();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8 text-purple-600" />
            Community Management
          </h1>
          <p className="text-muted-foreground mt-2">
            {totalCommunities} total communities in the platform
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-4">
        <form action="/dashboard/admin/communities" method="get">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              name="search"
              placeholder="Search communities by name or description..."
              defaultValue={search}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </div>

      {/* Communities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map((community) => (
          <div
            key={community.id}
            className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
          >
            {/* Community Image */}
            <div className="relative h-40 bg-gradient-to-br from-purple-500 to-pink-500">
              {community.image && (
                <Image
                  src={community.image}
                  alt={community.name}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-white font-bold text-lg truncate">
                  {community.name}
                </h3>
                <p className="text-white/80 text-sm">
                  /{community.slug}
                </p>
              </div>
            </div>

            {/* Community Info */}
            <div className="p-4 space-y-3">
              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {community.description || "No description"}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <Users className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs font-semibold">{community._count.members}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <MessageSquare className="w-4 h-4 mx-auto mb-1 text-green-600" />
                  <p className="text-xs font-semibold">{community._count.posts}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <Eye className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                  <p className="text-xs font-semibold">{community.visibility}</p>
                  <p className="text-xs text-muted-foreground">Visibility</p>
                </div>
              </div>

              {/* Owner */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                  {community.owner.name?.charAt(0) || community.owner.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{community.owner.name || "No name"}</p>
                  <p className="text-xs text-muted-foreground truncate">{community.owner.email}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/communities/${community.slug}/feed`}
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center text-sm"
                >
                  View
                </Link>
                <Link
                  href={`/dashboard/admin/communities/${community.id}`}
                  className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-center text-sm"
                >
                  Manage
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {communities.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No communities found matching your search criteria</p>
        </div>
      )}
    </div>
  );
}

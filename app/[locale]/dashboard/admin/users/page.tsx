import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { currentUserIsAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";
import { Users, Crown, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { UserFilters } from "@/components/admin/UserFilters";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { search?: string; role?: string };
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
  const roleFilter = searchParams.role || "all";

  // Build where clause
  const where: any = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  if (roleFilter !== "all") {
    where.appRole = roleFilter;
  }

  // Get users
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      appRole: true,
      subscriptionPlan: true,
      createdAt: true,
      lastActiveAt: true,
      _count: {
        select: {
          ownedCommunities: true,
          posts: true,
        },
      },
    },
  });

  const totalUsers = await prisma.user.count();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-2">
            {totalUsers} total users in the platform
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* How to Add Admins - Info Box */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Crown className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              How to Add Admins
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              To promote a user to admin, find them in the list below and use the <strong>Role dropdown</strong> in the table. 
              You can change any user's role to <strong>SUPER_ADMIN</strong>, <strong>ADMIN</strong>, <strong>MODERATOR</strong>, or <strong>USER</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <UserFilters />

      {/* Users List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-4 font-semibold">User</th>
              <th className="text-left p-4 font-semibold">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  Role (Click to Change)
                </div>
              </th>
              <th className="text-left p-4 font-semibold">Subscription</th>
              <th className="text-left p-4 font-semibold">Activity</th>
              <th className="text-right p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border hover:bg-muted/30 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.name || "No name"}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.username && (
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <UserRoleManager userId={user.id} currentRole={user.appRole || "USER"} />
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.subscriptionPlan === "PROFESSIONAL"
                        ? "bg-purple-100 text-purple-800"
                        : user.subscriptionPlan === "PREMIUM"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.subscriptionPlan || "FREE"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      {user._count.ownedCommunities} communities
                    </p>
                    <p className="text-muted-foreground">
                      {user._count.posts} posts
                    </p>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/dashboard/admin/users/${user.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found matching your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

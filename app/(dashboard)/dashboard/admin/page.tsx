import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { currentUserIsAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";
import { Users, Building2, DollarSign, TrendingUp, Crown, Shield, UserCog } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isAdmin = await currentUserIsAdmin();
  
  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Get platform statistics
  const [
    totalUsers,
    totalCommunities,
    totalPosts,
    totalSessions,
    recentUsers,
    adminUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.community.count(),
    prisma.post.count(),
    prisma.mentorSession.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        appRole: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        appRole: {
          in: ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        appRole: true,
      },
    }),
  ]);

  const stats = [
    {
      name: "Total Users",
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: "Communities",
      value: totalCommunities.toLocaleString(),
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      name: "Posts",
      value: totalPosts.toLocaleString(),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      name: "Video Sessions",
      value: totalSessions.toLocaleString(),
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Platform management and administration
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/admin/users"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Manage Users
          </Link>
          <Link
            href="/dashboard/admin/communities"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Manage Communities
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Team */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Admin Team
        </h2>
        <div className="space-y-3">
          {adminUsers.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                  {admin.name?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{admin.name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    admin.appRole === "SUPER_ADMIN"
                      ? "bg-yellow-100 text-yellow-800"
                      : admin.appRole === "ADMIN"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {admin.appRole}
                </span>
                <Link
                  href={`/dashboard/admin/users/${admin.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-600" />
            Recent Users
          </h2>
          <Link
            href="/dashboard/admin/users"
            className="text-sm text-primary hover:underline"
          >
            View All →
          </Link>
        </div>
        <div className="space-y-3">
          {recentUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{user.name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/dashboard/admin/users/${user.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

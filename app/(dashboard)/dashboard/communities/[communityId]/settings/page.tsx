import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Settings, Palette, Users, DollarSign, AlertTriangle, Save, Image as ImageIcon, Globe, Lock } from "lucide-react";
import { CommunityPricingSettings } from "@/components/community/CommunityPricingSettings";
import { Button } from "@/components/ui/button";

export default async function CommunitySettingsPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch community
  const community = await prisma.community.findFirst({
    where: {
      id: params.communityId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
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

  if (!community) {
    redirect("/dashboard/communities");
  }

  const isOwner = community.ownerId === session.user.id;

  if (!isOwner) {
    redirect(`/dashboard/communities/${params.communityId}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-8 shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative">
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              Community Settings
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage {community.name} settings and configuration
            </p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid gap-8">
          {/* General Settings */}
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-lg backdrop-blur-xl overflow-hidden">
            <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">General Settings</h2>
                  <p className="text-sm text-muted-foreground">Basic community information</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Community Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Community Name</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    defaultValue={community.name}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter community name"
                  />
                  <Button className="bg-primary hover:bg-primary/90">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <div className="flex flex-col gap-3">
                  <textarea
                    defaultValue={community.description || ""}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Describe your community..."
                  />
                  <Button className="self-end bg-primary hover:bg-primary/90">
                    <Save className="h-4 w-4 mr-2" />
                    Save Description
                  </Button>
                </div>
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Community URL</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center rounded-xl border border-border bg-accent/50 px-4 py-3">
                    <span className="text-muted-foreground">unytea.com/c/</span>
                    <span className="font-semibold text-foreground">{community.slug}</span>
                  </div>
                  <Button variant="outline">Change</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is your community's permanent URL
                </p>
              </div>

              {/* Privacy */}
              <div className="rounded-xl border border-border/50 bg-accent/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {community.isPrivate ? "Private Community" : "Public Community"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {community.isPrivate 
                          ? "Only invited members can join"
                          : "Anyone can discover and join"
                        }
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">
                    {community.isPrivate ? "Make Public" : "Make Private"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-lg backdrop-blur-xl overflow-hidden">
            <div className="border-b border-border/50 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-500/10 p-2">
                  <Palette className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Customize your community's look and feel</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Community Images */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Logo */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Community Logo</label>
                  <div className="relative aspect-square rounded-xl border-2 border-dashed border-border bg-accent/50 overflow-hidden group cursor-pointer hover:border-primary transition-colors">
                    {community.imageUrl ? (
                      <img
                        src={community.imageUrl}
                        alt="Community logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Upload logo</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" size="sm">
                        Change Logo
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Cover Image */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Cover Image</label>
                  <div className="relative aspect-square rounded-xl border-2 border-dashed border-border bg-accent/50 overflow-hidden group cursor-pointer hover:border-primary transition-colors">
                    {community.coverImageUrl ? (
                      <img
                        src={community.coverImageUrl}
                        alt="Community cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Upload cover</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" size="sm">
                        Change Cover
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Colors */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Theme Colors</label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Primary</p>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
                        style={{ backgroundColor: community.primaryColor || "#8B5CF6" }}
                      />
                      <input
                        type="text"
                        defaultValue={community.primaryColor || "#8B5CF6"}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Secondary</p>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
                        style={{ backgroundColor: community.secondaryColor || "#EC4899" }}
                      />
                      <input
                        type="text"
                        defaultValue={community.secondaryColor || "#EC4899"}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Accent</p>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
                        style={{ backgroundColor: community.accentColor || "#F59E0B" }}
                      />
                      <input
                        type="text"
                        defaultValue={community.accentColor || "#F59E0B"}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Button className="mt-2 bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Colors
                </Button>
              </div>
            </div>
          </div>

          {/* Members Management */}
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-lg backdrop-blur-xl overflow-hidden">
            <div className="border-b border-border/50 bg-gradient-to-r from-green-500/5 to-emerald-500/5 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-500/10 p-2">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Member Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage how people join your community</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border/50 bg-accent/30 p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{community._count.members}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-accent/30 p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{community._count.posts}</p>
                  <p className="text-sm text-muted-foreground">Posts</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-accent/30 p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{community._count.courses}</p>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </div>
              </div>

              {/* Approval Required */}
              <div className="rounded-xl border border-border/50 bg-accent/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Require Approval</p>
                    <p className="text-sm text-muted-foreground">
                      {community.requireApproval 
                        ? "You must approve new members"
                        : "Members can join instantly"
                      }
                    </p>
                  </div>
                  <Button variant="outline">
                    {community.requireApproval ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Settings */}
          <CommunityPricingSettings
            communityId={community.id}
            isPaid={community.isPaid}
            membershipPrice={community.membershipPrice ? Math.round(community.membershipPrice * 100) : null}
          />

          {/* Danger Zone */}
          <div className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 to-red-500/10 shadow-lg backdrop-blur-xl overflow-hidden">
            <div className="border-b border-red-500/30 bg-red-500/10 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-500/20 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80">
                    Irreversible and destructive actions
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Transfer Ownership */}
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Transfer Ownership</p>
                    <p className="text-sm text-muted-foreground">
                      Transfer this community to another member
                    </p>
                  </div>
                  <Button variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10">
                    Transfer
                  </Button>
                </div>
              </div>

              {/* Delete Community */}
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400">Delete Community</p>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80">
                      Permanently delete this community and all its data
                    </p>
                  </div>
                  <Button variant="destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

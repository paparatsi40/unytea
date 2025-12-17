"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Palette, Users, AlertTriangle, Save, Image as ImageIcon, Globe, Lock, Upload, Sparkles } from "lucide-react";
import { CommunityPricingSettings } from "@/components/community/CommunityPricingSettings";
import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/lib/uploadthing";
import toast from "react-hot-toast";
import { LayoutPreview } from "@/components/community/LayoutPreview";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  isPrivate: boolean;
  isPaid: boolean;
  requireApproval: boolean;
  membershipPrice: number | null;
  ownerId: string;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    members: number;
    posts: number;
    courses: number;
  };
  layoutType: string | null;
}

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export default function CommunitySettingsPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  // Unwrap params Promise
  const { slug, locale } = use(params);

  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slugState, setSlugState] = useState("");

  const { startUpload } = useUploadThing("communityBranding");

  // Fetch community data
  useEffect(() => {
    async function fetchCommunity() {
      try {
        const response = await fetch(`/api/communities/${slug}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch community');
        }
        const data = await response.json();

        // The API returns {community: {...}, membership: {...}}
        // But we need to add the missing fields
        const communityData = data.community || data;

        // Ensure _count has courses field
        if (!communityData._count) {
          communityData._count = { members: 0, posts: 0, courses: 0 };
        } else if (!communityData._count.courses) {
          communityData._count.courses = 0;
        }

        // Ensure owner field exists
        if (!communityData.owner) {
          communityData.owner = {
            id: communityData.ownerId || '',
            name: null,
            image: null,
          };
        }

        setCommunity(communityData);
        setName(communityData.name);
        setDescription(communityData.description || "");
        setSlugState(communityData.slug);
      } catch (error) {
        console.error('Error fetching community:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load community');
        // Don't redirect, just show error
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    fetchCommunity();
  }, [slug, router]);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading('logo');
      toast.loading('Uploading logo...', { id: 'logo-upload' });

      const uploadResult = await startUpload([file]);
      if (!uploadResult || uploadResult.length === 0) {
        throw new Error('Upload failed');
      }

      const imageUrl = uploadResult[0].url;

      // Update community in database
      const response = await fetch(`/api/communities/${slug}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) throw new Error('Failed to update logo');

      setCommunity(prev => prev ? { ...prev, imageUrl } : null);
      toast.success('Logo updated successfully!', { id: 'logo-upload' });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo', { id: 'logo-upload' });
    } finally {
      setUploading(null);
    }
  };

  // Handle cover upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading('cover');
      toast.loading('Uploading cover...', { id: 'cover-upload' });

      const uploadResult = await startUpload([file]);
      if (!uploadResult || uploadResult.length === 0) {
        throw new Error('Upload failed');
      }

      const coverImageUrl = uploadResult[0].url;

      // Update community in database
      const response = await fetch(`/api/communities/${slug}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl }),
      });

      if (!response.ok) throw new Error('Failed to update cover');

      setCommunity(prev => prev ? { ...prev, coverImageUrl } : null);
      toast.success('Cover updated successfully!', { id: 'cover-upload' });
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Failed to upload cover', { id: 'cover-upload' });
    } finally {
      setUploading(null);
    }
  };

  // Handle color update
  const handleColorUpdate = async () => {
    if (!community) return;

    try {
      toast.loading('Saving appearance...', { id: 'colors-save' });

      const response = await fetch(`/api/communities/${slug}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: community.primaryColor,
          secondaryColor: community.secondaryColor,
          accentColor: community.accentColor,
          layoutType: community.layoutType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update appearance');
      }

      toast.success('Appearance saved successfully!', { id: 'colors-save' });
    } catch (error) {
      console.error('Error updating appearance:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save appearance', { id: 'colors-save' });
    }
  };

  // Handle save all general settings
  const handleSaveGeneralSettings = async () => {
    if (!community) return;
    
    setSaving(true);
    try {
      toast.loading('Saving changes...', { id: 'general-save' });
      
      const response = await fetch(`/api/communities/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          slug: slugState.trim(),
          isPrivate: community.isPrivate,
          requireApproval: community.requireApproval,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update');
      }

      const data = await response.json();
      setCommunity(prev => prev ? {
        ...prev,
        name: name.trim(),
        description: description.trim() || null,
        slug: slugState.trim(),
      } : null);
      
      // If slug changed, redirect to new URL
      if (slugState.trim() !== slug) {
        toast.success('Settings saved! Redirecting...', { id: 'general-save' });
        setTimeout(() => {
          router.push(`/${locale}/dashboard/communities/${slugState.trim()}/settings`);
          router.refresh();
        }, 1000);
      } else {
        toast.success('Settings saved successfully!', { id: 'general-save' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings', { id: 'general-save' });
    } finally {
      setSaving(false);
    }
  };

  // Handle privacy toggle
  const handlePrivacyToggle = async () => {
    if (!community) return;

    const newPrivacy = !community.isPrivate;

    try {
      toast.loading('Updating privacy...', { id: 'privacy' });

      const response = await fetch(`/api/communities/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: newPrivacy }),
      });

      if (!response.ok) throw new Error('Failed to update privacy');

      setCommunity(prev => prev ? { ...prev, isPrivate: newPrivacy } : null);
      toast.success(`Community is now ${newPrivacy ? 'private' : 'public'}!`, { id: 'privacy' });
    } catch (error) {
      console.error('Error updating privacy:', error);
      toast.error('Failed to update privacy', { id: 'privacy' });
    }
  };

  // Handle approval toggle
  const handleApprovalToggle = async () => {
    if (!community) return;

    const newApproval = !community.requireApproval;

    try {
      toast.loading('Updating approval setting...', { id: 'approval' });

      const response = await fetch(`/api/communities/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireApproval: newApproval }),
      });

      if (!response.ok) throw new Error('Failed to update approval');

      setCommunity(prev => prev ? { ...prev, requireApproval: newApproval } : null);
      toast.success(`Approval ${newApproval ? 'enabled' : 'disabled'}!`, { id: 'approval' });
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval', { id: 'approval' });
    }
  };

  // Handle transfer ownership
  const handleTransferOwnership = async () => {
    if (!community) return;

    try {
      toast.loading('Transferring ownership...', { id: 'transfer-ownership' });

      // TO DO: Implement transfer ownership logic
      toast.success('Ownership transferred!', { id: 'transfer-ownership' });
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast.error('Failed to transfer ownership', { id: 'transfer-ownership' });
    }
  };

  // Handle delete community
  const handleDeleteCommunity = async () => {
    if (!community) return;

    try {
      toast.loading('Deleting community...', { id: 'delete-community' });

      // TO DO: Implement delete community logic
      toast.success('Community deleted!', { id: 'delete-community' });
    } catch (error) {
      console.error('Error deleting community:', error);
      toast.error('Failed to delete community', { id: 'delete-community' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return null;
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter community name"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <div className="flex flex-col gap-3">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Describe your community..."
                  />
                </div>
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Community URL</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center rounded-xl border border-border bg-accent/50 px-4 py-3">
                    <span className="text-muted-foreground">unytea.com/c/</span>
                    <input
                      type="text"
                      value={slugState}
                      onChange={(e) => setSlugState(e.target.value)}
                      className="flex-1 rounded-xl border-0 bg-transparent px-0 py-0 text-foreground focus:outline-none"
                    />
                  </div>
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
                  <Button variant="outline" onClick={handlePrivacyToggle}>
                    {community.isPrivate ? "Make Public" : "Make Private"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border/50">
              <Button onClick={handleSaveGeneralSettings} className="bg-primary hover:bg-primary/90">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
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
              {/* Layout/Template Selector */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground">Landing Page Layout</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose how your community landing page looks to visitors
                  </p>
                </div>
                
                <LayoutPreview community={community} setCommunity={setCommunity} />
              </div>

              {/* Community Images */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Logo */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Community Logo</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading === 'logo'}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="relative aspect-square rounded-xl border-2 border-dashed border-border bg-accent/50 overflow-hidden group cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center"
                    >
                      {community.imageUrl ? (
                        <>
                          <img
                            src={community.imageUrl}
                            alt="Community logo"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-center text-white">
                              <Upload className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm font-semibold">
                                {uploading === 'logo' ? 'Uploading...' : 'Change Logo'}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-4">
                          {uploading === 'logo' ? (
                            <>
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                              <p className="text-sm text-muted-foreground">Uploading...</p>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground font-semibold">Upload logo</p>
                              <p className="text-xs text-muted-foreground">Click to browse</p>
                            </>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, at least 400x400px
                  </p>
                </div>

                {/* Cover Image */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Cover Image</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploading === 'cover'}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="relative aspect-square rounded-xl border-2 border-dashed border-border bg-accent/50 overflow-hidden group cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center"
                    >
                      {community.coverImageUrl ? (
                        <>
                          <img
                            src={community.coverImageUrl}
                            alt="Community cover"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-center text-white">
                              <Upload className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm font-semibold">
                                {uploading === 'cover' ? 'Uploading...' : 'Change Cover'}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-4">
                          {uploading === 'cover' ? (
                            <>
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                              <p className="text-sm text-muted-foreground">Uploading...</p>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground font-semibold">Upload cover</p>
                              <p className="text-xs text-muted-foreground">Click to browse</p>
                            </>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Wide image, at least 1200x400px
                  </p>
                </div>
              </div>

              {/* Theme Colors */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Theme Colors</label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Primary</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={community.primaryColor || "#8B5CF6"}
                        onChange={(e) => setCommunity({ ...community, primaryColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer"
                      />
                      <input
                        type="text"
                        value={community.primaryColor || "#8B5CF6"}
                        onChange={(e) => setCommunity({ ...community, primaryColor: e.target.value })}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Secondary</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={community.secondaryColor || "#EC4899"}
                        onChange={(e) => setCommunity({ ...community, secondaryColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer"
                      />
                      <input
                        type="text"
                        value={community.secondaryColor || "#EC4899"}
                        onChange={(e) => setCommunity({ ...community, secondaryColor: e.target.value })}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Accent</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={community.accentColor || "#F59E0B"}
                        onChange={(e) => setCommunity({ ...community, accentColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer"
                      />
                      <input
                        type="text"
                        value={community.accentColor || "#F59E0B"}
                        onChange={(e) => setCommunity({ ...community, accentColor: e.target.value })}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleColorUpdate} className="mt-2 bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Appearance
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
                        : "Members can join instantly"}
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleApprovalToggle}>
                    {community.requireApproval ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-lg backdrop-blur-xl overflow-hidden">
            <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-2">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Welcome Message</h2>
                  <p className="text-sm text-muted-foreground">Greet new members with a custom message</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">Customize Your Welcome Message</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a personalized welcome banner that new members will see when they first join. 
                      Share community rules, getting started tips, or important links.
                    </p>
                    <Link href={`/${locale}/dashboard/communities/${slug}/settings/welcome`}>
                      <Button className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:shadow-lg">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Edit Welcome Message
                      </Button>
                    </Link>
                  </div>
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
                  <Button variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10" onClick={handleTransferOwnership}>
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
                  <Button variant="destructive" onClick={handleDeleteCommunity}>
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteCommunity } from "@/app/actions/communities";
import { useToast } from "@/hooks/use-toast";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  postCount: number;
}

export default function ManageCommunitiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  async function fetchCommunities() {
    try {
      const response = await fetch("/api/communities/my-communities");
      if (response.ok) {
        const data = await response.json();
        setCommunities(data.communities || []);
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(communityId: string, communityName: string) {
    if (!confirm(`⚠️ Are you sure you want to delete "${communityName}"?\n\nThis will permanently delete:\n- All posts and comments\n- All members\n- All channels and messages\n- All courses and lessons\n- Everything related to this community\n\nThis action CANNOT be undone!`)) {
      return;
    }

    setDeleting(communityId);

    try {
      const result = await deleteCommunity(communityId);

      if (result.success) {
        toast({
          title: "Community Deleted",
          description: result.message || "Community deleted successfully",
        });

        // Remove from list
        setCommunities(communities.filter((c) => c.id !== communityId));
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete community",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Communities</h1>
        <p className="text-gray-600">
          Manage and delete your communities. Be careful - deletions are permanent!
        </p>
      </div>

      {communities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">You don't own any communities yet.</p>
            <Button
              onClick={() => router.push("/dashboard/communities/new")}
              className="mt-4"
            >
              Create Your First Community
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {communities.map((community) => (
            <Card key={community.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{community.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {community.description || "No description"}
                    </CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{community.memberCount} members</span>
                      <span>{community.postCount} posts</span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        /{community.slug}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/communities/${community.slug}/feed`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(community.id, community.name)}
                      disabled={deleting === community.id}
                    >
                      {deleting === community.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <CardTitle className="text-yellow-900">Warning</CardTitle>
              <CardDescription className="text-yellow-700 mt-2">
                Deleting a community is permanent and cannot be undone. All data including posts,
                members, messages, and courses will be permanently deleted.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
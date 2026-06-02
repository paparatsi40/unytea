"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteCommunity } from "@/app/actions/communities";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  postCount: number;
}

export default function ManageCommunitiesPage() {
  const t = useTranslations("dashboard.communities");
  const tCommon = useTranslations("common");
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
    if (!confirm(t("manage.deleteConfirm", { name: communityName }))) {
      return;
    }

    setDeleting(communityId);

    try {
      const result = await deleteCommunity(communityId);

      if (result.success) {
        toast({
          title: t("manage.toasts.deletedTitle"),
          description: result.message || t("manage.toasts.deleted"),
        });

        // Remove from list
        setCommunities(communities.filter((c) => c.id !== communityId));
      } else {
        toast({
          title: t("manage.toasts.errorTitle"),
          description: result.error || t("manage.toasts.deleteFailed"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("manage.toasts.errorTitle"),
        description: t("manage.toasts.unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-8">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{t("manage.title")}</h1>
        <p className="text-gray-600">{t("manage.subtitle")}</p>
      </div>

      {communities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">{t("manage.emptyState.description")}</p>
            <Button onClick={() => router.push("/dashboard/communities/new")} className="mt-4">
              {t("manage.emptyState.createButton")}
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
                      {community.description || t("manage.card.noDescription")}
                    </CardDescription>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span>{t("manage.card.members", { count: community.memberCount })}</span>
                      <span>{t("manage.card.posts", { count: community.postCount })}</span>
                      <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                        /{community.slug}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/c/${community.slug}`)}
                    >
                      {t("manage.card.viewButton")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(community.id, community.name)}
                      disabled={deleting === community.id}
                    >
                      {deleting === community.id ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          {t("manage.card.deletingButton")}
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon("delete")}
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
            <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
            <div>
              <CardTitle className="text-yellow-900">{t("manage.warning.title")}</CardTitle>
              <CardDescription className="mt-2 text-yellow-700">
                {t("manage.warning.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

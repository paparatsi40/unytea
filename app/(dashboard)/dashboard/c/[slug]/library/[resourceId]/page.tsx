"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getDateFnsLocale } from "@/lib/i18n/date-fns-locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Heart,
  Eye,
  Clock,
  FileText,
  Video,
  Music,
  Link as LinkIcon,
  Share2,
  Trash2,
  Edit,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getResourceById, toggleResourceLike, deleteResource } from "@/app/actions/resources";
import type { ResourceType } from "@prisma/client";

const resourceTypeIcons: Record<ResourceType, typeof FileText> = {
  DOCUMENT: FileText,
  VIDEO: Video,
  AUDIO: Music,
  LINK: LinkIcon,
};

const resourceTypeColors: Record<ResourceType, string> = {
  DOCUMENT: "from-blue-500 to-blue-600",
  VIDEO: "from-red-500 to-red-600",
  AUDIO: "from-green-500 to-green-600",
  LINK: "from-orange-500 to-orange-600",
};

export default function ResourceDetailPage() {
  const t = useTranslations("library");
  const locale = useLocale();
  const dfLocale = getDateFnsLocale(locale);
  const params = useParams();
  const communitySlug = params?.slug as string | undefined;
  const resourceId = params?.resourceId as string | undefined;

  const [resource, setResource] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchResource = useCallback(async () => {
    if (!communitySlug || !resourceId) return;

    setIsLoading(true);
    try {
      const result = await getResourceById(resourceId, communitySlug);
      if (result.success) {
        setResource(result.data);
      } else {
        toast.error(result.error || t("detail.loadError"));
      }
    } catch (error) {
      console.error("Error fetching resource:", error);
      toast.error(t("detail.loadError"));
    }
    setIsLoading(false);
  }, [communitySlug, resourceId, t]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const handleLike = async () => {
    if (!resourceId) return;

    const result = await toggleResourceLike({ resourceId });
    if (result.success) {
      setResource((prev: any) =>
        prev
          ? {
              ...prev,
              _count: { ...prev._count, likes: result.data.likesCount },
              likes: result.data.liked ? [{ id: "temp" }] : [],
            }
          : null
      );
      toast.success(result.data.liked ? t("like.liked") : t("like.unliked"));
    }
  };

  const handleDelete = async () => {
    if (!resourceId || !confirm(t("delete.confirm"))) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteResource(resourceId);
    if (result.success) {
      toast.success(t("delete.success"));
      window.location.href = `/dashboard/c/${communitySlug}/library`;
    } else {
      toast.error(result.error || t("detail.deleteError"));
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    if (resource?.fileUrl) {
      window.open(resource.fileUrl, "_blank");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: resource?.title || t("detail.shareFallbackTitle"),
        text: resource?.description || "",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t("detail.linkCopied"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
          <p className="text-muted-foreground">{t("detail.loading")}</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">{t("detail.notFoundTitle")}</h2>
          <p className="mb-4 text-muted-foreground">{t("detail.notFoundBody")}</p>
          <Link href={`/dashboard/c/${communitySlug}/library`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("detail.backToLibrary")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const TypeIcon = resourceTypeIcons[resource.type as ResourceType] || FileText;
  const typeColor =
    resourceTypeColors[resource.type as ResourceType] || "from-gray-500 to-gray-600";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/c/${communitySlug}/library`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t("detail.back")}
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("detail.breadcrumb")}</span>
                <span>/</span>
                <span className="max-w-[200px] truncate font-medium text-foreground md:max-w-md">
                  {resource.title}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLike}
                className={resource.likes?.length > 0 ? "text-red-500" : ""}
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${resource.likes?.length > 0 ? "fill-current" : ""}`}
                />
                {resource._count?.likes || 0}
              </Button>

              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                {t("detail.share")}
              </Button>

              {(resource.canEdit || resource.canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {resource.canEdit && (
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        {t("detail.edit")}
                      </DropdownMenuItem>
                    )}
                    {resource.canDelete && (
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? t("detail.deleting") : t("detail.delete")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Resource Header Card */}
            <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div
                  className={`h-16 w-16 rounded-xl bg-gradient-to-br ${typeColor} flex flex-shrink-0 items-center justify-center text-white shadow-lg`}
                >
                  <TypeIcon className="h-8 w-8" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t(`resourceType.${resource.type as ResourceType}`)}
                    </span>
                    {resource.category && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {resource.category.name}
                        </span>
                      </>
                    )}
                  </div>

                  <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
                    {resource.title}
                  </h1>

                  {resource.description && (
                    <p className="mb-4 text-muted-foreground">{resource.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{t("detail.views", { count: resource.viewCount || 0 })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(resource.createdAt), "PPP", { locale: dfLocale })}
                      </span>
                    </div>
                    {resource.author && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {t("detail.by", { name: resource.author.name })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex flex-wrap gap-3">
              {resource.fileUrl && (
                <Button
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("detail.download")}
                </Button>
              )}
            </div>

            {/* Media Players */}
            {resource.type === "VIDEO" && resource.fileUrl && (
              <div className="mb-6 aspect-video w-full overflow-hidden rounded-xl bg-black">
                <video
                  src={resource.fileUrl}
                  controls
                  className="h-full w-full"
                  poster="/video-poster.png"
                >
                  {t("detail.videoUnsupported")}
                </video>
              </div>
            )}

            {resource.type === "AUDIO" && resource.fileUrl && (
              <div className="mb-6 w-full rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-6">
                <audio src={resource.fileUrl} controls className="w-full">
                  {t("detail.audioUnsupported")}
                </audio>
              </div>
            )}

            {resource.type === "LINK" && resource.fileUrl && (
              <div className="mb-6 w-full rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-6">
                <p className="mb-2 text-sm text-muted-foreground">{t("detail.externalLink")}</p>
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-orange-600 hover:underline"
                >
                  {resource.fileUrl}
                </a>
              </div>
            )}

            {resource.type === "DOCUMENT" && resource.fileUrl && (
              <div className="mb-6 w-full rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-6">
                <p className="mb-2 text-sm text-muted-foreground">{t("detail.documentFile")}</p>
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-600 hover:underline"
                >
                  {resource.fileUrl}
                </a>
              </div>
            )}

            {/* Additional Info */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  {t("detail.tags")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

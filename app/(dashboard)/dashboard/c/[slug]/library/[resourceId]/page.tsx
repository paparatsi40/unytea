"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
import {
  getResourceById,
  toggleResourceLike,
  deleteResource,
} from "@/app/actions/resources";
import type { ResourceType } from "@prisma/client";

const resourceTypeIcons: Record<ResourceType, typeof FileText> = {
  DOCUMENT: FileText,
  VIDEO: Video,
  AUDIO: Music,
  LINK: LinkIcon,
};

const resourceTypeLabels: Record<ResourceType, string> = {
  DOCUMENT: "Documento",
  VIDEO: "Video",
  AUDIO: "Audio",
  LINK: "Enlace",
};

const resourceTypeColors: Record<ResourceType, string> = {
  DOCUMENT: "from-blue-500 to-blue-600",
  VIDEO: "from-red-500 to-red-600",
  AUDIO: "from-green-500 to-green-600",
  LINK: "from-orange-500 to-orange-600",
};

export default function ResourceDetailPage() {
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
        toast.error(result.error || "Error al cargar el recurso");
      }
    } catch (error) {
      console.error("Error fetching resource:", error);
      toast.error("Error al cargar el recurso");
    } finally {
      setIsLoading(false);
    }
  }, [communitySlug, resourceId]);

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
      toast.success(result.data.liked ? "¡Te gusta este recurso!" : "Like removido");
    }
  };

  const handleDelete = async () => {
    if (!resourceId || !confirm("¿Estás seguro de que quieres eliminar este recurso?")) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteResource(resourceId);
    if (result.success) {
      toast.success("Recurso eliminado");
      window.location.href = `/dashboard/c/${communitySlug}/library`;
    } else {
      toast.error(result.error || "Error al eliminar el recurso");
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
        title: resource?.title || "Recurso",
        text: resource?.description || "",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Enlace copiado al portapapeles");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando recurso...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Recurso no encontrado</h2>
          <p className="text-muted-foreground mb-4">
            El recurso que buscas no existe o no tienes acceso a él.
          </p>
          <Link href={`/dashboard/c/${communitySlug}/library`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a la biblioteca
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const TypeIcon = resourceTypeIcons[resource.type as ResourceType] || FileText;
  const typeColor = resourceTypeColors[resource.type as ResourceType] || "from-gray-500 to-gray-600";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/c/${communitySlug}/library`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Biblioteca</span>
                <span>/</span>
                <span className="text-foreground font-medium truncate max-w-[200px] md:max-w-md">
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
                <Heart className={`w-4 h-4 mr-2 ${resource.likes?.length > 0 ? "fill-current" : ""}`} />
                {resource._count?.likes || 0}
              </Button>

              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>

              {(resource.canEdit || resource.canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {resource.canEdit && (
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {resource.canDelete && (
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? "Eliminando..." : "Eliminar"}
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
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Resource Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${typeColor} flex items-center justify-center text-white shadow-lg flex-shrink-0`}
                >
                  <TypeIcon className="w-8 h-8" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {resourceTypeLabels[resource.type as ResourceType]}
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

                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {resource.title}
                  </h1>

                  {resource.description && (
                    <p className="text-muted-foreground mb-4">{resource.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>{resource.viewCount || 0} vistas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(resource.createdAt).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {resource.author && (
                      <div className="flex items-center gap-2">
                        <span>por</span>
                        <span className="font-medium text-foreground">{resource.author.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              {resource.fileUrl && (
                <Button
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar / Ver recurso
                </Button>
              )}
            </div>

            {/* Media Players */}
            {resource.type === "VIDEO" && resource.fileUrl && (
              <div className="w-full bg-black rounded-xl overflow-hidden aspect-video mb-6">
                <video
                  src={resource.fileUrl}
                  controls
                  className="w-full h-full"
                  poster="/video-poster.png"
                >
                  Tu navegador no soporta el elemento video.
                </video>
              </div>
            )}

            {resource.type === "AUDIO" && resource.fileUrl && (
              <div className="w-full bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 mb-6">
                <audio src={resource.fileUrl} controls className="w-full">
                  Tu navegador no soporta el elemento audio.
                </audio>
              </div>
            )}

            {resource.type === "LINK" && resource.fileUrl && (
              <div className="w-full bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Enlace externo:</p>
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline break-all"
                >
                  {resource.fileUrl}
                </a>
              </div>
            )}

            {resource.type === "DOCUMENT" && resource.fileUrl && (
              <div className="w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Archivo de documento</p>
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {resource.fileUrl}
                </a>
              </div>
            )}

            {/* Additional Info */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Etiquetas</h3>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
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

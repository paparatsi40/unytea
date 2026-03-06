"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Play,
  FileText,
  Headphones,
  ExternalLink,
  Heart,
  Eye,
  Clock,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ResourceType, ResourceStatus } from "@prisma/client";

interface ResourceCardProps {
  resource: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    type: ResourceType;
    status: ResourceStatus;
    thumbnailUrl: string | null;
    duration: number | null;
    tags: string[];
    viewCount: number;
    _count: { likes: number };
    category?: { id: string; name: string; color: string | null } | null;
    author: { id: string; name: string | null; image: string | null };
    progress?: { progress: number; completed: boolean }[];
  };
  communitySlug: string;
  onLike?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  variant?: "default" | "compact" | "featured";
}

const typeIcons = {
  AUDIO: Headphones,
  VIDEO: Play,
  DOCUMENT: FileText,
  LINK: ExternalLink,
};

const typeColors = {
  AUDIO: "from-rose-500 to-pink-600",
  VIDEO: "from-purple-500 to-violet-600",
  DOCUMENT: "from-blue-500 to-cyan-600",
  LINK: "from-emerald-500 to-teal-600",
};

const typeBgColors = {
  AUDIO: "bg-rose-50 dark:bg-rose-950/30",
  VIDEO: "bg-purple-50 dark:bg-purple-950/30",
  DOCUMENT: "bg-blue-50 dark:bg-blue-950/30",
  LINK: "bg-emerald-50 dark:bg-emerald-950/30",
};

export function ResourceCard({
  resource,
  communitySlug,
  onLike,
  onDelete,
  canEdit = false,
  variant = "default",
}: ResourceCardProps) {
  const Icon = typeIcons[resource.type];
  const progress = resource.progress?.[0]?.progress ?? 0;
  const isCompleted = resource.progress?.[0]?.completed ?? false;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="group"
      >
        <Link
          href={`/dashboard/c/${communitySlug}/library/${resource.id}`}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
            "hover:shadow-md border border-transparent hover:border-border/50",
            typeBgColors[resource.type]
          )}
        >
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              "bg-gradient-to-br text-white",
              typeColors[resource.type]
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{resource.title}</h4>
            {resource.duration && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(resource.duration)}
              </p>
            )}
          </div>
          {isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      <Link
        href={`/dashboard/c/${communitySlug}/library/${resource.id}`}
        className={cn(
          "block rounded-2xl overflow-hidden transition-all duration-300",
          "bg-white dark:bg-gray-900/50",
          "border border-border/50 hover:border-border",
          "shadow-sm hover:shadow-xl",
          "backdrop-blur-sm"
        )}
      >
        {/* Thumbnail / Gradient Header */}
        <div
          className={cn(
            "relative aspect-video overflow-hidden",
            "bg-gradient-to-br",
            typeColors[resource.type]
          )}
        >
          {resource.thumbnailUrl ? (
            <Image
              src={resource.thumbnailUrl}
              alt={resource.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-16 h-16 text-white/40" />
            </div>
          )}

          {/* Type Badge */}
          <div className="absolute top-3 left-3">
            <Badge
              variant="secondary"
              className="bg-white/90 dark:bg-black/50 backdrop-blur-sm"
            >
              <Icon className="w-3 h-3 mr-1" />
              {resource.type}
            </Badge>
          </div>

          {/* Category Badge */}
          {resource.category && (
            <div className="absolute top-3 right-3">
              <Badge
                style={{
                  backgroundColor: resource.category.color || undefined,
                }}
                className="text-white"
              >
                {resource.category.name}
              </Badge>
            </div>
          )}

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
              </div>
            </motion.div>
          </div>

          {/* Duration Badge */}
          {resource.duration && (
            <div className="absolute bottom-3 right-3">
              <Badge
                variant="secondary"
                className="bg-black/70 text-white border-0"
              >
                {formatDuration(resource.duration)}
              </Badge>
            </div>
          )}

          {/* Progress Overlay */}
          {progress > 0 && !isCompleted && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Completed Checkmark */}
          {isCompleted && (
            <div className="absolute bottom-3 left-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {resource.title}
              </h3>
              {resource.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {resource.description}
                </p>
              )}
            </div>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete?.();
                    }}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {resource.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-2 py-0.5"
                >
                  #{tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{resource.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-3">
              {resource.author.image ? (
                <Image
                  src={resource.author.image}
                  alt={resource.author.name || ""}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
              )}
              <span className="text-sm text-muted-foreground">
                {resource.author.name}
              </span>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm">
                <Eye className="w-4 h-4" />
                {resource.viewCount.toLocaleString()}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onLike?.();
                }}
                className="flex items-center gap-1 text-sm hover:text-red-500 transition-colors"
              >
                <Heart className="w-4 h-4" />
                {resource._count.likes.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

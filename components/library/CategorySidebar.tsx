"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FolderOpen,
  MoreHorizontal,
  Settings,
  Music,
  Video,
  FileText,
  Link2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  position: number;
  _count?: { resources: number };
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onCreateCategory?: () => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  canManage?: boolean;
  totalResources?: number;
}

const getCategoryIcon = (iconName: string | null, _color: string | null) => {
  const icons: Record<string, React.ReactNode> = {
    music: <Music className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    link: <Link2 className="h-4 w-4" />,
    folder: <FolderOpen className="h-4 w-4" />,
  };

  return icons[iconName || ""] || <FolderOpen className="h-4 w-4" />;
};

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  canManage = false,
  totalResources = 0,
}: CategorySidebarProps) {
  const t = useTranslations("library.categories");
  const totalInCategories = categories.reduce((acc, cat) => acc + (cat._count?.resources || 0), 0);
  const uncategorizedCount = Math.max(0, totalResources - totalInCategories);

  return (
    <div className="w-full space-y-4 lg:w-64">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("title")}
        </h3>
        {canManage && (
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onCreateCategory}>
            <Plus className="mr-1 h-4 w-4" />
            {t("new")}
          </Button>
        )}
      </div>

      {/* All Resources */}
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelectCategory(null)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl p-3 text-left",
          "transition-all duration-200",
          selectedCategoryId === null
            ? "border border-primary/20 bg-primary/10 text-primary"
            : "border border-transparent hover:bg-muted"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <FolderOpen className="h-4 w-4" />
          </div>
          <span className="font-medium">{t("allResources")}</span>
        </div>
        <span className="text-sm text-muted-foreground">{totalResources}</span>
      </motion.button>

      {/* Categories List */}
      <div className="space-y-1">
        {categories.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>{t("noCategories")}</p>
            {canManage && <p className="mt-1">{t("createFirst")}</p>}
          </div>
        ) : (
          categories
            .sort((a, b) => a.position - b.position)
            .map((category) => (
              <motion.div
                key={category.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "group flex items-center gap-2 rounded-xl",
                  "transition-all duration-200",
                  selectedCategoryId === category.id
                    ? "border border-primary/10 bg-primary/5"
                    : "border border-transparent hover:bg-muted"
                )}
              >
                <button
                  onClick={() => onSelectCategory(category.id)}
                  className="flex flex-1 items-center gap-3 p-3 text-left"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{
                      backgroundColor: category.color || "#8B5CF6",
                    }}
                  >
                    {getCategoryIcon(category.icon, category.color)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{category.name}</p>
                    {category.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {category._count?.resources || 0}
                  </span>
                </button>

                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-1 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditCategory?.(category)}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteCategory?.(category.id)}
                      >
                        {t("deleteLabel")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            ))
        )}
      </div>

      {/* Uncategorized */}
      {uncategorizedCount > 0 && (
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectCategory("uncategorized")}
          className={cn(
            "flex w-full items-center justify-between rounded-xl p-3 text-left",
            "transition-all duration-200",
            selectedCategoryId === "uncategorized"
              ? "border border-border bg-muted"
              : "border border-transparent hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
            </div>
            <span className="font-medium text-muted-foreground">{t("uncategorized")}</span>
          </div>
          <span className="text-sm text-muted-foreground">{uncategorizedCount}</span>
        </motion.button>
      )}
    </div>
  );
}

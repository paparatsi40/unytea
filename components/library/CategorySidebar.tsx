"use client";

import { motion } from "framer-motion";
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
    music: <Music className="w-4 h-4" />,
    video: <Video className="w-4 h-4" />,
    document: <FileText className="w-4 h-4" />,
    link: <Link2 className="w-4 h-4" />,
    folder: <FolderOpen className="w-4 h-4" />,
  };

  return icons[iconName || ""] || <FolderOpen className="w-4 h-4" />;
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
  const totalInCategories = categories.reduce(
    (acc, cat) => acc + (cat._count?.resources || 0),
    0
  );
  const uncategorizedCount = Math.max(0, totalResources - totalInCategories);

  return (
    <div className="w-full lg:w-64 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Categorías
        </h3>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onCreateCategory}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        )}
      </div>

      {/* All Resources */}
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelectCategory(null)}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-xl text-left",
          "transition-all duration-200",
          selectedCategoryId === null
            ? "bg-primary/10 text-primary border border-primary/20"
            : "hover:bg-muted border border-transparent"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
            <FolderOpen className="w-4 h-4" />
          </div>
          <span className="font-medium">Todos los recursos</span>
        </div>
        <span className="text-sm text-muted-foreground">{totalResources}</span>
      </motion.button>

      {/* Categories List */}
      <div className="space-y-1">
        {categories.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>No hay categorías aún</p>
            {canManage && (
              <p className="mt-1">Crea la primera para organizar tus recursos</p>
            )}
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
                    ? "bg-primary/5 border border-primary/10"
                    : "hover:bg-muted border border-transparent"
                )}
              >
                <button
                  onClick={() => onSelectCategory(category.id)}
                  className="flex-1 flex items-center gap-3 p-3 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{
                      backgroundColor: category.color || "#8B5CF6",
                    }}
                  >
                    {getCategoryIcon(category.icon, category.color)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{category.name}</p>
                    {category.description && (
                      <p className="text-xs text-muted-foreground truncate">
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
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEditCategory?.(category)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteCategory?.(category.id)}
                      >
                        Eliminar
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
            "w-full flex items-center justify-between p-3 rounded-xl text-left",
            "transition-all duration-200",
            selectedCategoryId === "uncategorized"
              ? "bg-muted border border-border"
              : "hover:bg-muted/50 border border-transparent"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <FolderOpen className="w-4 h-4" />
            </div>
            <span className="font-medium text-muted-foreground">
              Sin categoría
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {uncategorizedCount}
          </span>
        </motion.button>
      )}
    </div>
  );
}

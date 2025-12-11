"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

interface BreadcrumbsProps {
  customLabels?: Record<string, string>;
  maxItems?: number;
}

export function Breadcrumbs({ customLabels = {}, maxItems = 5 }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Don't show on root or auth pages
  if (!pathname || pathname === "/" || pathname.startsWith("/auth")) {
    return null;
  }

  // Parse pathname into segments
  const segments = pathname.split("/").filter(Boolean);

  // Generate breadcrumb items
  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    
    // Get label (custom or formatted)
    let label = customLabels[segment] || customLabels[href];
    
    if (!label) {
      // Auto-format: "my-community" -> "My Community"
      label = segment
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      
      // Special cases
      if (segment === "c") label = "Communities";
      if (segment === "dashboard") label = "Dashboard";
    }

    return {
      href,
      label,
      isLast: index === segments.length - 1,
    };
  });

  // Limit items if needed
  const displayItems = items.length > maxItems
    ? [
        items[0],
        { href: "#", label: "...", isLast: false },
        ...items.slice(-2),
      ]
    : items;

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      {/* Home link */}
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {/* Breadcrumb items */}
      {displayItems.map((item, index) => (
        <Fragment key={item.href + index}>
          <ChevronRight className="h-4 w-4" />
          {item.isLast ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : item.label === "..." ? (
            <span className="text-muted-foreground">...</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

// Hook for custom breadcrumbs in specific pages
export function useBreadcrumbs(labels: Record<string, string>) {
  return { customLabels: labels };
}
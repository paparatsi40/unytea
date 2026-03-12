"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SessionLayoutProps {
  children: ReactNode;
  className?: string;
}

export function SessionLayout({ children, className }: SessionLayoutProps) {
  return (
    <div className={cn("flex h-[calc(100vh-200px)] min-h-[600px] gap-4", className)}>
      {children}
    </div>
  );
}

export function SessionMain({ children, className }: SessionLayoutProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-4", className)}>
      {children}
    </div>
  );
}

export function SessionSidebar({ children, className }: SessionLayoutProps) {
  return (
    <div className={cn("flex w-80 flex-col gap-4", className)}>
      {children}
    </div>
  );
}

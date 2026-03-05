"use client";

import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { markAllNotificationsAsRead, deleteAllReadNotifications } from "@/app/actions/notifications";
import { useState } from "react";
import { toast } from "sonner";

interface NotificationHeaderProps {
  unreadCount: number;
}

export function NotificationHeader({ unreadCount }: NotificationHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    const result = await markAllNotificationsAsRead();
    
    if (result.success) {
      toast.success("All notifications marked as read");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to mark all as read");
    }
    setIsLoading(false);
  };

  const handleDeleteAllRead = async () => {
    setIsLoading(true);
    const result = await deleteAllReadNotifications();
    
    if (result.success) {
      toast.success("All read notifications deleted");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to delete notifications");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
          <Bell className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
        <button
          onClick={handleDeleteAllRead}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Clear read
        </button>
      </div>
    </div>
  );
}

"use client";

import { Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  markAllNotificationsAsRead,
  deleteAllReadNotifications,
} from "@/app/actions/notifications";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface NotificationHeaderProps {
  unreadCount: number;
}

export function NotificationHeader({ unreadCount }: NotificationHeaderProps) {
  const t = useTranslations("dashboard.notifications");
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    const result = await markAllNotificationsAsRead();

    if (result.success) {
      toast.success(t("markAllReadSuccess"));
      window.location.reload();
    } else {
      toast.error(result.error || t("markAllReadError"));
    }
    setIsLoading(false);
  };

  const handleDeleteAllRead = async () => {
    setIsLoading(true);
    const result = await deleteAllReadNotifications();

    if (result.success) {
      toast.success(t("clearReadSuccess"));
      window.location.reload();
    } else {
      toast.error(result.error || t("clearReadError"));
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
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allCaughtUp")}
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
            {t("markAllRead")}
          </button>
        )}
        <button
          onClick={handleDeleteAllRead}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {t("clearRead")}
        </button>
      </div>
    </div>
  );
}

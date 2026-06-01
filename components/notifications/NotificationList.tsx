"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { NotificationItem } from "./NotificationItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  link?: string | null;
  isRead: boolean;
  createdAt: Date;
  sender?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  const t = useTranslations("dashboard.notifications");
  const locale = useLocale();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter((notif) =>
    filter === "all" ? true : !notif.isRead
  );

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce(
    (acc, notif) => {
      const date = new Date(notif.createdAt).toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(notif);
      return acc;
    },
    {} as Record<string, Notification[]>
  );

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="all">{t("filterAll", { count: notifications.length })}</TabsTrigger>
        <TabsTrigger value="unread">
          {t("filterUnread", { count: notifications.filter((n) => !n.isRead).length })}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={filter} className="mt-6 space-y-8">
        {filteredNotifications.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12">
            <Bell className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {t("noNotificationsTitle")}
            </h3>
            <p className="text-center text-sm text-muted-foreground">
              {filter === "unread" ? t("emptyUnreadBody") : t("emptyAllBody")}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{date}</h3>
              <div className="space-y-2">
                {notifs.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

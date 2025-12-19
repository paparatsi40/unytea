"use client";

import { useState } from "react";
import { NotificationItem } from "./NotificationItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
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
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter((notif) =>
    filter === "all" ? true : !notif.isRead
  );

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((acc, notif) => {
    const date = new Date(notif.createdAt).toLocaleDateString("en-US", {
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
  }, {} as Record<string, Notification[]>);

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
        <TabsTrigger value="unread">
          Unread ({notifications.filter((n) => !n.isRead).length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value={filter} className="mt-6 space-y-8">
        {filteredNotifications.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12">
            <Bell className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              No notifications
            </h3>
            <p className="text-center text-sm text-muted-foreground">
              {filter === "unread"
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {date}
              </h3>
              <div className="space-y-2">
                {notifs.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

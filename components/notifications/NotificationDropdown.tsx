"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";
import { NotificationItem, type NotificationItemData } from "./NotificationItem";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  deleteAllReadNotifications,
} from "@/app/actions/notifications";

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const loadNotifications = async () => {
    const result = await getUserNotifications(20);

    if (result.success && result.notifications) {
      // Server returns the Prisma rows (data: JsonValue, no sender/link relation);
      // the item shape narrows those — the component reads them defensively.
      setNotifications(result.notifications as unknown as NotificationItemData[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Auto-refresh every 30 seconds when open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    setIsMarkingAllRead(true);
    await markAllNotificationsAsRead();
    await loadNotifications();
    setIsMarkingAllRead(false);
  };

  const handleClearRead = async () => {
    await deleteAllReadNotifications();
    await loadNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 transition-colors hover:bg-white/10"
      >
        <Bell className="h-5 w-5 text-white/80 hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown content */}
          <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
            {/* Header */}
            <div className="border-b border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-sm text-white/60">({unreadCount} new)</span>
                  )}
                </h3>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAllRead}
                    className="flex items-center gap-2 rounded-lg px-3 py-1 text-sm text-purple-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Bell className="h-8 w-8 text-purple-500" />
                  </div>
                  <h4 className="mb-2 text-lg font-semibold text-white">All caught up!</h4>
                  <p className="text-sm text-white/60">You have no new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onUpdate={loadNotifications}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between border-t border-white/10 bg-zinc-900/50 p-3 backdrop-blur-sm">
                <button
                  onClick={handleClearRead}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white/90"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear read
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-purple-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

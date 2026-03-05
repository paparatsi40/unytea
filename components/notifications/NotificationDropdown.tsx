"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  deleteAllReadNotifications,
} from "@/app/actions/notifications";

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const loadNotifications = async () => {
    const result = await getUserNotifications(20);
    
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
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
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-white/80 hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 mt-2 w-96 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-sm text-white/60">
                      ({unreadCount} new)
                    </span>
                  )}
                </h3>
                
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAllRead}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-purple-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    All caught up!
                  </h4>
                  <p className="text-sm text-white/60">
                    You have no new notifications
                  </p>
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
              <div className="p-3 border-t border-white/10 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between">
                <button
                  onClick={handleClearRead}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear read
                </button>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-purple-400 hover:text-purple-300 px-3 py-2 hover:bg-purple-500/10 rounded-lg transition-colors"
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

"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, MessageCircle, Users, Trophy, Heart, AlertCircle } from "lucide-react";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/app/actions/notifications";
import { useSocket } from "@/hooks/use-socket";
import { useCurrentUser } from "@/hooks/use-current-user";

type NotificationType = "MESSAGE" | "COMMENT" | "REACTION" | "NEW_POST" | "NEW_MEMBER" | "ACHIEVEMENT" | "SYSTEM";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  data?: any;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();
  const { user } = useCurrentUser();

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  // WebSocket: Real-time notification updates
  useEffect(() => {
    if (!socket || !isConnected || !user?.id) return;

    // Join user's personal room
    socket.emit("join:user", user.id);

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      
      // Optional: Show browser notification
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/icon.png",
        });
      }
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, isConnected, user?.id]);

  const loadNotifications = async () => {
    setLoading(true);
    const result = await getUserNotifications(20);
    if (result.success && result.notifications) {
      setNotifications(result.notifications as any);
    }
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date() })));
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteNotification(id);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "MESSAGE":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case "COMMENT":
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      case "REACTION":
        return <Heart className="h-5 w-5 text-pink-500" />;
      case "NEW_POST":
        return <AlertCircle className="h-5 w-5 text-purple-500" />;
      case "NEW_MEMBER":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "ACHIEVEMENT":
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diff = now.getTime() - notificationDate.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group relative p-4 hover:bg-gray-50 ${
                        !notification.isRead ? "bg-purple-50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {getIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatTimestamp(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                            title="Delete"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="absolute left-2 top-6 h-2 w-2 rounded-full bg-purple-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => {
                    // Navigate to all notifications page
                    setIsOpen(false);
                  }}
                  className="w-full rounded p-2 text-center text-sm text-purple-600 hover:bg-purple-50"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bell, X, Video, Calendar, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

type SessionNotification = {
  id: string;
  sessionId: string;
  sessionTitle: string;
  communityName?: string;
  timeUntilStart?: number; // minutes
  hasStarted: boolean;
};

export function SessionNotificationBanner() {
  const [notifications, setNotifications] = useState<SessionNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    // Check for active session notifications
    checkNotifications();

    // Poll every 30 seconds
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  const checkNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/active-sessions");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching session notifications:", error);
    }
  };

  const handleDismiss = (notificationId: string) => {
    setDismissed(prev => new Set(prev).add(notificationId));
  };

  const handleJoin = (sessionId: string, communitySlug?: string) => {
    if (communitySlug) {
      router.push(`/dashboard/communities/${communitySlug}/sessions/${sessionId}/room`);
    } else {
      router.push(`/dashboard/sessions/${sessionId}/room`);
    }
  };

  const visibleNotifications = notifications.filter(
    n => !dismissed.has(n.id)
  );

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-20 left-64 right-0 z-40 p-4">
      <div className="mx-auto max-w-4xl space-y-2">
        {visibleNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-top ${
              notification.hasStarted
                ? "border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                : "border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10"
            }`}
          >
            {/* Animated gradient bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              notification.hasStarted 
                ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                : "bg-gradient-to-r from-yellow-500 to-orange-500"
            }`}>
              <div className="h-full w-full animate-pulse" />
            </div>

            <div className="flex items-center gap-4 p-4">
              {/* Icon */}
              <div className={`flex-shrink-0 rounded-full p-3 ${
                notification.hasStarted
                  ? "bg-purple-500/20"
                  : "bg-yellow-500/20"
              }`}>
                {notification.hasStarted ? (
                  <Video className={`h-6 w-6 ${
                    notification.hasStarted ? "text-purple-500" : "text-yellow-500"
                  } animate-pulse`} />
                ) : (
                  <Calendar className="h-6 w-6 text-yellow-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-lg">
                    {notification.hasStarted ? "🎥 Session Started!" : "⏰ Session Starting Soon"}
                  </h3>
                  {notification.hasStarted && (
                    <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-600 animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-foreground/90 font-medium mt-1">
                  {notification.sessionTitle}
                </p>
                {notification.communityName && (
                  <p className="text-muted-foreground text-sm mt-0.5">
                    in {notification.communityName}
                  </p>
                )}
                {!notification.hasStarted && notification.timeUntilStart && (
                  <p className="text-yellow-600 font-semibold text-sm mt-1">
                    Starts in {notification.timeUntilStart} minutes
                  </p>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleJoin(notification.sessionId)}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 shadow-lg ${
                  notification.hasStarted
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                    : "bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700"
                }`}
              >
                {notification.hasStarted ? (
                  <>
                    <Video className="h-5 w-5" />
                    Join Now
                    <ArrowRight className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    <Bell className="h-5 w-5" />
                    Get Ready
                  </>
                )}
              </button>

              {/* Dismiss Button */}
              <button
                onClick={() => handleDismiss(notification.id)}
                className="flex-shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
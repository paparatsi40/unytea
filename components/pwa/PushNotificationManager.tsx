"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      // Get VAPID key
      const vapidRes = await fetch("/api/push/vapid");
      if (!vapidRes.ok) {
        console.error("VAPID key not available");
        setLoading(false);
        return;
      }
      const { publicKey } = await vapidRes.json();

      // Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Send subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Failed to subscribe to push:", error);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          isSubscribed ? "bg-purple-500/10" : "bg-zinc-800"
        }`}
      >
        {isSubscribed ? (
          <Bell className="h-5 w-5 text-purple-400" />
        ) : (
          <BellOff className="h-5 w-5 text-zinc-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">Push Notifications</p>
        <p className="text-xs text-zinc-500">
          {permission === "denied"
            ? "Notifications are blocked in your browser settings"
            : isSubscribed
              ? "You'll receive alerts for sessions, posts, and achievements"
              : "Get notified about sessions, community activity, and more"}
        </p>
      </div>

      {permission === "denied" ? (
        <span className="text-xs text-red-400">Blocked</span>
      ) : (
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            isSubscribed
              ? "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              : "bg-purple-600 text-white hover:bg-purple-500"
          } disabled:opacity-50`}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isSubscribed ? (
            "Disable"
          ) : (
            "Enable"
          )}
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register service worker after page load
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check for updates periodically (every 60 minutes)
        setInterval(
          () => {
            registration.update().catch(() => {});
          },
          60 * 60 * 1000
        );

        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available — could show update banner here
              console.log("[SW] New version available");
            }
          });
        });
      } catch (err) {
        console.warn("[SW] Registration failed:", err);
      }
    });
  }, []);

  return null;
}

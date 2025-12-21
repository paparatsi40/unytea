"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Socket.IO server URL - Railway for production, local for development
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
  (typeof window !== "undefined" && window.location.hostname === "localhost" 
    ? "http://localhost:3001" 
    : "https://unytea-socketio-production.up.railway.app");

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    if (!socket) {
      try {
        console.log("🔌 Connecting to Socket.IO server:", SOCKET_URL);
        
        socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        socket.on("connect", () => {
          console.log("✅ Socket connected:", socket?.id);
          setIsConnected(true);
        });

        socket.on("disconnect", () => {
          console.log("❌ Socket disconnected");
          setIsConnected(false);
        });

        socket.on("connect_error", (error) => {
          console.log("⚠️ Socket connection error:", error.message);
          setIsConnected(false);
        });
      } catch (error) {
        console.log("❌ Socket initialization failed:", error);
      }
    }

    return () => {
      // Don't disconnect on component unmount, keep connection alive
    };
  }, []);

  return {
    socket,
    isConnected,
  };
}

// Helper hooks for specific features
export function useSocketEvent(event: string, callback: (data: any) => void) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, isConnected, event, callback]);
}

// Chat-specific socket hooks
export function useChatSocket(channelId: string | null) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!socket || !isConnected || !channelId) return;

    // Join channel room
    socket.emit("join:channel", channelId);

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      setMessages((prev) => [...prev, message]);
    };

    // Listen for deleted messages
    const handleDeletedMessage = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:deleted", handleDeletedMessage);

    return () => {
      socket.emit("leave:channel", channelId);
      socket.off("message:new", handleNewMessage);
      socket.off("message:deleted", handleDeletedMessage);
    };
  }, [socket, isConnected, channelId]);

  const sendTyping = (userId: string, userName: string) => {
    if (socket && channelId) {
      socket.emit("typing:start", { channelId, userId, userName });
    }
  };

  const stopTyping = (userId: string) => {
    if (socket && channelId) {
      socket.emit("typing:stop", { channelId, userId });
    }
  };

  return {
    messages,
    sendTyping,
    stopTyping,
    isConnected,
  };
}

// Presence socket hook
export function usePresenceSocket(communityId: string | null) {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isConnected || !communityId) return;

    // Join community room
    socket.emit("join:community", communityId);

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    return () => {
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
    };
  }, [socket, isConnected, communityId]);

  return {
    onlineUsers: Array.from(onlineUsers),
    isConnected,
  };
}

// Notifications socket hook
export function useNotificationsSocket(userId: string | null) {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!socket || !isConnected || !userId) return;

    // Join user room
    socket.emit("join:user", userId);

    const handleNewNotification = (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, isConnected, userId]);

  return {
    notifications,
    isConnected,
  };
}

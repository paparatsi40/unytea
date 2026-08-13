"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import PusherClient from "pusher-js";

interface PusherMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  conversationId?: string;
}

type MessageHandler = (message: PusherMessage) => void;
type ConnectionHandler = (state: "connected" | "disconnected") => void;

/**
 * Subscribe to a private realtime channel.
 *
 * Receive-only by design. This hook used to expose `sendMessage` and
 * `sendTyping`, which POSTed a client-chosen channel, event name and payload to
 * a free-form `PUT /api/pusher` trigger — cross-tenant event injection
 * (SEC-06). That endpoint is gone. Writes go through the relevant Server
 * Action, which persists and then emits server-side once the seam has
 * authorized the caller.
 *
 * `channelId` is either a community `Channel.id` or a `Conversation.id`; the
 * auth route resolves both and checks the matching rule.
 */
export function usePusher(channelId: string, userId: string) {
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);
  const messageHandlersRef = useRef<Set<MessageHandler>>(new Set());
  const connectionHandlersRef = useRef<Set<ConnectionHandler>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Pusher connection
  useEffect(() => {
    if (!channelId || !userId) return;

    // Initialize Pusher client
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
      authEndpoint: "/api/pusher",
      auth: {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    });

    pusherRef.current = pusher;

    // Subscribe to channel
    const channelName = `private-channel-${channelId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Handle connection events
    pusher.connection.bind("connected", () => {
      setIsConnected(true);
      connectionHandlersRef.current.forEach((handler) => handler("connected"));
    });

    pusher.connection.bind("disconnected", () => {
      setIsConnected(false);
      connectionHandlersRef.current.forEach((handler) => handler("disconnected"));
    });

    // Handle incoming messages
    channel.bind("message", (data: PusherMessage) => {
      messageHandlersRef.current.forEach((handler) => handler(data));
    });

    // Handle typing indicators
    channel.bind("typing", (data: { userId: string; userName: string }) => {
      // Typing event - can be handled separately if needed
      console.log("Typing:", data);
    });

    // Cleanup on unmount
    return () => {
      try {
        // Check connection state before unsubscribing
        if (pusher?.connection?.state === "connected") {
          pusher.unsubscribe(channelName);
          pusher.disconnect();
        }
      } catch (error) {
        // Silently ignore errors during cleanup (connection may already be closed)
        console.debug("[Pusher] Cleanup error (expected):", error);
      }
      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [channelId, userId]);

  // Subscribe to messages
  const onMessage = useCallback((handler: MessageHandler) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  // Subscribe to connection state changes
  const onConnectionChange = useCallback((handler: ConnectionHandler) => {
    connectionHandlersRef.current.add(handler);
    return () => {
      connectionHandlersRef.current.delete(handler);
    };
  }, []);

  return {
    onMessage,
    onConnectionChange,
    isConnected,
  };
}

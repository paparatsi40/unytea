import { useState, useEffect, useCallback } from "react";
import { Room, DataPacket_Kind, RoomEvent } from "livekit-client";

export interface HandRaiseEntry {
  participantId: string;
  participantName: string;
  timestamp: number;
  identity: string;
}

interface HandRaiseMessage {
  type: "hand-raise" | "hand-lower" | "hand-clear" | "hand-sync";
  participantId: string;
  participantName: string;
  timestamp?: number;
  queue?: HandRaiseEntry[];
}

/**
 * Custom hook for Hand Raise functionality in LiveKit rooms
 * Uses LiveKit data messages for real-time synchronization
 */
export function useHandRaise(room: Room | undefined) {
  const [queue, setQueue] = useState<HandRaiseEntry[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Send data message to all participants
  const sendMessage = useCallback(
    (message: HandRaiseMessage) => {
      if (!room) return;

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));

      room.localParticipant.publishData(data, {
        reliable: true,
        destinationIdentities: [], // Send to all
        topic: "hand-raise",
      });
    },
    [room]
  );

  // Raise hand
  const raiseHand = useCallback(() => {
    if (!room || isHandRaised) return;

    const message: HandRaiseMessage = {
      type: "hand-raise",
      participantId: room.localParticipant.sid,
      participantName: room.localParticipant.name || "Anonymous",
      timestamp: Date.now(),
    };

    sendMessage(message);
    setIsHandRaised(true);

    // Add to local queue
    setQueue((prev) => [
      ...prev,
      {
        participantId: room.localParticipant.sid,
        participantName: room.localParticipant.name || "Anonymous",
        timestamp: Date.now(),
        identity: room.localParticipant.identity,
      },
    ]);
  }, [room, isHandRaised, sendMessage]);

  // Lower hand
  const lowerHand = useCallback(
    (participantId?: string) => {
      if (!room) return;

      const targetId = participantId || room.localParticipant.sid;

      const message: HandRaiseMessage = {
        type: "hand-lower",
        participantId: targetId,
        participantName: room.localParticipant.name || "Anonymous",
      };

      sendMessage(message);

      if (targetId === room.localParticipant.sid) {
        setIsHandRaised(false);
      }

      // Remove from local queue
      setQueue((prev) => prev.filter((entry) => entry.participantId !== targetId));
    },
    [room, sendMessage]
  );

  // Clear all hands (moderator only)
  const clearAllHands = useCallback(() => {
    if (!room) return;

    const message: HandRaiseMessage = {
      type: "hand-clear",
      participantId: room.localParticipant.sid,
      participantName: room.localParticipant.name || "Anonymous",
    };

    sendMessage(message);
    setQueue([]);
    setIsHandRaised(false);
  }, [room, sendMessage]);

  // Handle incoming data messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant: any,
      _kind?: DataPacket_Kind,
      topic?: string
    ) => {
      if (topic !== "hand-raise") return;

      try {
        const decoder = new TextDecoder();
        const messageStr = decoder.decode(payload);
        const message: HandRaiseMessage = JSON.parse(messageStr);

        switch (message.type) {
          case "hand-raise":
            // Add to queue if not already there
            setQueue((prev) => {
              const exists = prev.some(
                (entry) => entry.participantId === message.participantId
              );
              if (exists) return prev;

              return [
                ...prev,
                {
                  participantId: message.participantId,
                  participantName: message.participantName,
                  timestamp: message.timestamp || Date.now(),
                  identity: participant?.identity || "",
                },
              ].sort((a, b) => a.timestamp - b.timestamp);
            });

            // Update own state if it's our hand
            if (message.participantId === room.localParticipant.sid) {
              setIsHandRaised(true);
            }
            break;

          case "hand-lower":
            setQueue((prev) =>
              prev.filter((entry) => entry.participantId !== message.participantId)
            );

            if (message.participantId === room.localParticipant.sid) {
              setIsHandRaised(false);
            }
            break;

          case "hand-clear":
            setQueue([]);
            setIsHandRaised(false);
            break;

          case "hand-sync":
            // Sync queue from moderator
            if (message.queue) {
              setQueue(message.queue);
              const isInQueue = message.queue.some(
                (entry) => entry.participantId === room.localParticipant.sid
              );
              setIsHandRaised(isInQueue);
            }
            break;
        }
      } catch (error) {
        console.error("Error handling hand raise message:", error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Sync queue when new participants join (moderator broadcasts)
  const syncQueue = useCallback(() => {
    if (!room || queue.length === 0) return;

    const message: HandRaiseMessage = {
      type: "hand-sync",
      participantId: room.localParticipant.sid,
      participantName: room.localParticipant.name || "Anonymous",
      queue,
    };

    sendMessage(message);
  }, [room, queue, sendMessage]);

  return {
    queue,
    isHandRaised,
    raiseHand,
    lowerHand,
    clearAllHands,
    syncQueue,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, RemoteParticipant } from "livekit-client";

// ── Event types sent over LiveKit data channel ──────────────────────────
export type DataChannelEvent =
  | { type: "hand_raise"; identity: string; name: string; raised: boolean; timestamp: number }
  | { type: "hand_clear"; identity: string }
  | { type: "invite_speaker"; identity: string; invitedBy: string }
  | { type: "mute_all"; by: string }
  | { type: "poll_create"; poll: DataChannelPoll }
  | { type: "poll_vote"; pollId: string; optionId: string; voterId: string; voterName: string }
  | { type: "poll_close"; pollId: string }
  | { type: "reaction"; emoji: string; label: string; from: string; timestamp: number };

export interface DataChannelPoll {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
  endsAt?: number;
  isQuiz?: boolean;
  correctAnswer?: string;
}

export interface RaisedHand {
  id: string;
  identity: string;
  name: string;
  timestamp: number;
}

export interface ActivePoll {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    votes: number;
    voters: string[];
  }[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
  endsAt?: number;
  isActive: boolean;
  totalVotes: number;
  correctAnswer?: string;
  showResults?: boolean;
}

// ── Hook ────────────────────────────────────────────────────────────────
export function useSessionDataChannel() {
  const room = useRoomContext();
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [activePolls, setActivePolls] = useState<ActivePoll[]>([]);
  const [invitedToSpeak, setInvitedToSpeak] = useState(false);
  const [muteAllSignal, setMuteAllSignal] = useState(0); // increment to trigger
  const decoder = useRef(new TextDecoder());
  const encoder = useRef(new TextEncoder());

  // ── Publish helper ──────────────────────────────────────────────────
  const publish = useCallback(
    async (event: DataChannelEvent) => {
      try {
        const data = encoder.current.encode(JSON.stringify(event));
        await room.localParticipant.publishData(data, { reliable: true });
      } catch (err) {
        console.error("[DataChannel] Failed to publish:", err);
      }
    },
    [room]
  );

  // ── Incoming data handler ───────────────────────────────────────────
  useEffect(() => {
    const handleData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant
    ) => {
      try {
        const raw = decoder.current.decode(payload);
        const event: DataChannelEvent = JSON.parse(raw);

        switch (event.type) {
          case "hand_raise": {
            if (event.raised) {
              setRaisedHands((prev) => {
                // Avoid duplicates
                if (prev.some((h) => h.identity === event.identity)) return prev;
                return [
                  ...prev,
                  {
                    id: `${event.identity}-${event.timestamp}`,
                    identity: event.identity,
                    name: event.name,
                    timestamp: event.timestamp,
                  },
                ];
              });
            } else {
              setRaisedHands((prev) =>
                prev.filter((h) => h.identity !== event.identity)
              );
            }
            break;
          }

          case "hand_clear": {
            setRaisedHands((prev) =>
              prev.filter((h) => h.identity !== event.identity)
            );
            // If it was our hand that got cleared
            if (event.identity === room.localParticipant.identity) {
              setHasRaisedHand(false);
            }
            break;
          }

          case "invite_speaker": {
            if (event.identity === room.localParticipant.identity) {
              setInvitedToSpeak(true);
              // Auto-clear after 30s
              setTimeout(() => setInvitedToSpeak(false), 30000);
            }
            // Remove from raised hands queue
            setRaisedHands((prev) =>
              prev.filter((h) => h.identity !== event.identity)
            );
            break;
          }

          case "mute_all": {
            // Don't mute the person who sent it
            if (event.by !== room.localParticipant.identity) {
              setMuteAllSignal((prev) => prev + 1);
            }
            break;
          }

          case "poll_create": {
            const newPoll: ActivePoll = {
              id: event.poll.id,
              question: event.poll.question,
              options: event.poll.options.map((o) => ({
                ...o,
                votes: 0,
                voters: [],
              })),
              createdBy: event.poll.createdBy,
              createdByName: event.poll.createdByName,
              createdAt: event.poll.createdAt,
              endsAt: event.poll.endsAt,
              isActive: true,
              totalVotes: 0,
              correctAnswer: event.poll.correctAnswer,
              showResults: false,
            };
            setActivePolls((prev) => [...prev, newPoll]);
            break;
          }

          case "poll_vote": {
            setActivePolls((prev) =>
              prev.map((poll) => {
                if (poll.id !== event.pollId) return poll;
                // Already voted check
                const alreadyVoted = poll.options.some((o) =>
                  o.voters.includes(event.voterId)
                );
                if (alreadyVoted) return poll;

                return {
                  ...poll,
                  totalVotes: poll.totalVotes + 1,
                  options: poll.options.map((o) =>
                    o.id === event.optionId
                      ? {
                          ...o,
                          votes: o.votes + 1,
                          voters: [...o.voters, event.voterId],
                        }
                      : o
                  ),
                };
              })
            );
            break;
          }

          case "poll_close": {
            setActivePolls((prev) =>
              prev.map((poll) =>
                poll.id === event.pollId
                  ? { ...poll, isActive: false, showResults: true }
                  : poll
              )
            );
            break;
          }

          // Reactions are handled by ReactionsBar already, but we can
          // listen here too for future overlay features
          case "reaction":
            break;
        }
      } catch (err) {
        // Silently ignore non-JSON payloads (e.g. LiveKit internal data)
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  // Clean up hands when participants leave
  useEffect(() => {
    const handleDisconnect = (participant: RemoteParticipant) => {
      setRaisedHands((prev) =>
        prev.filter((h) => h.identity !== participant.identity)
      );
    };

    room.on(RoomEvent.ParticipantDisconnected, handleDisconnect);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnect);
    };
  }, [room]);

  // ── Actions ─────────────────────────────────────────────────────────

  const toggleRaiseHand = useCallback(() => {
    const newState = !hasRaisedHand;
    setHasRaisedHand(newState);

    const event: DataChannelEvent = {
      type: "hand_raise",
      identity: room.localParticipant.identity,
      name: room.localParticipant.name || "Anonymous",
      raised: newState,
      timestamp: Date.now(),
    };

    // Update local state immediately
    if (newState) {
      setRaisedHands((prev) => [
        ...prev,
        {
          id: `${room.localParticipant.identity}-${Date.now()}`,
          identity: room.localParticipant.identity,
          name: room.localParticipant.name || "Anonymous",
          timestamp: Date.now(),
        },
      ]);
    } else {
      setRaisedHands((prev) =>
        prev.filter((h) => h.identity !== room.localParticipant.identity)
      );
    }

    publish(event);
  }, [hasRaisedHand, room, publish]);

  const inviteSpeaker = useCallback(
    (identity: string) => {
      // Clear from queue
      setRaisedHands((prev) => prev.filter((h) => h.identity !== identity));

      publish({
        type: "invite_speaker",
        identity,
        invitedBy: room.localParticipant.identity,
      });

      // Also publish a hand_clear so everyone removes it from their UI
      publish({
        type: "hand_clear",
        identity,
      });
    },
    [room, publish]
  );

  const dismissHand = useCallback(
    (identity: string) => {
      setRaisedHands((prev) => prev.filter((h) => h.identity !== identity));
      publish({ type: "hand_clear", identity });
    },
    [publish]
  );

  const muteAll = useCallback(() => {
    publish({
      type: "mute_all",
      by: room.localParticipant.identity,
    });
  }, [room, publish]);

  const createPoll = useCallback(
    (
      question: string,
      options: string[],
      duration?: number,
      isQuiz?: boolean,
      correctAnswer?: string
    ) => {
      const pollId = `poll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const pollOptions = options.map((text, i) => ({
        id: `opt-${i}`,
        text,
      }));

      const poll: DataChannelPoll = {
        id: pollId,
        question,
        options: pollOptions,
        createdBy: room.localParticipant.identity,
        createdByName: room.localParticipant.name || "Host",
        createdAt: Date.now(),
        endsAt: duration ? Date.now() + duration * 1000 : undefined,
        isQuiz,
        correctAnswer,
      };

      // Add locally
      const activePoll: ActivePoll = {
        ...poll,
        options: pollOptions.map((o) => ({ ...o, votes: 0, voters: [] })),
        isActive: true,
        totalVotes: 0,
        showResults: false,
      };
      setActivePolls((prev) => [...prev, activePoll]);

      // Broadcast
      publish({ type: "poll_create", poll });
    },
    [room, publish]
  );

  const votePoll = useCallback(
    (pollId: string, optionId: string) => {
      const voterId = room.localParticipant.identity;
      const voterName = room.localParticipant.name || "Anonymous";

      // Update locally
      setActivePolls((prev) =>
        prev.map((poll) => {
          if (poll.id !== pollId) return poll;
          const alreadyVoted = poll.options.some((o) =>
            o.voters.includes(voterId)
          );
          if (alreadyVoted) return poll;

          return {
            ...poll,
            totalVotes: poll.totalVotes + 1,
            options: poll.options.map((o) =>
              o.id === optionId
                ? { ...o, votes: o.votes + 1, voters: [...o.voters, voterId] }
                : o
            ),
          };
        })
      );

      // Broadcast
      publish({ type: "poll_vote", pollId, optionId, voterId, voterName });
    },
    [room, publish]
  );

  const closePoll = useCallback(
    (pollId: string) => {
      setActivePolls((prev) =>
        prev.map((poll) =>
          poll.id === pollId
            ? { ...poll, isActive: false, showResults: true }
            : poll
        )
      );
      publish({ type: "poll_close", pollId });
    },
    [publish]
  );

  return {
    // Hand raise
    raisedHands,
    hasRaisedHand,
    toggleRaiseHand,
    inviteSpeaker,
    dismissHand,

    // Polls
    activePolls,
    createPoll,
    votePoll,
    closePoll,

    // Moderation
    muteAll,
    muteAllSignal,

    // Speaker invite
    invitedToSpeak,
    clearSpeakerInvite: () => setInvitedToSpeak(false),
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, RemoteParticipant } from "livekit-client";
import { publishWhenReady } from "@/lib/livekit/data-transport";

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

/**
 * A reaction currently on screen.
 *
 * There was no such thing until now. `ReactionsBar` published a `reaction`
 * packet and the handler below answered it with `case "reaction": break;`,
 * under a comment saying reactions were "handled by ReactionsBar already" —
 * which was never true: that component only ever sent. So every reaction anyone
 * has ever pressed, host or member, went onto the wire and was displayed by
 * nobody. This is the half that was missing.
 */
export interface RoomReaction {
  id: string;
  emoji: string;
  label: string;
  from: string;
  timestamp: number;
}

/** How long a reaction stays on screen. Long enough to read, short enough to
 * not become clutter when several arrive at once. */
export const REACTION_TTL_MS = 4000;

/** Nothing on screen past this, so a burst cannot grow without bound. */
const MAX_VISIBLE_REACTIONS = 12;

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
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  const decoder = useRef(new TextDecoder());
  const encoder = useRef(new TextEncoder());

  /** Ids for on-screen reactions. A counter, because two people can react in
   * the same millisecond and a timestamp would collide. */
  const reactionSeq = useRef(0);
  /** Every pending expiry, so unmounting does not leave timers setting state
   * on a component that is gone. */
  const reactionTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const showReaction = useCallback((reaction: Omit<RoomReaction, "id">) => {
    const id = `reaction-${reactionSeq.current++}`;
    setReactions((prev) => [...prev, { ...reaction, id }].slice(-MAX_VISIBLE_REACTIONS));

    const timer = setTimeout(() => {
      reactionTimers.current.delete(timer);
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, REACTION_TTL_MS);
    reactionTimers.current.add(timer);
  }, []);

  useEffect(() => {
    const timers = reactionTimers.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // ── Publish helper ──────────────────────────────────────────────────
  const publish = useCallback(
    async (event: DataChannelEvent): Promise<boolean> => {
      // Everything on this channel comes from someone pressing something, so
      // there is no next tick to retry on. A member presses within seconds of
      // arriving — the window where the engine has no peer connection yet — so
      // this waits for the transport instead of throwing the packet away.
      const sent = await publishWhenReady(room, encoder.current.encode(JSON.stringify(event)), {
        reliable: true,
      });
      if (!sent) {
        console.warn("[DataChannel] Not sent, transport unavailable:", event.type);
      }
      return sent;
    },
    [room]
  );

  // ── Incoming data handler ───────────────────────────────────────────
  useEffect(() => {
    const handleData = (payload: Uint8Array, _participant?: RemoteParticipant) => {
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
              setRaisedHands((prev) => prev.filter((h) => h.identity !== event.identity));
            }
            break;
          }

          case "hand_clear": {
            setRaisedHands((prev) => prev.filter((h) => h.identity !== event.identity));
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
            setRaisedHands((prev) => prev.filter((h) => h.identity !== event.identity));
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
                const alreadyVoted = poll.options.some((o) => o.voters.includes(event.voterId));
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
                poll.id === event.pollId ? { ...poll, isActive: false, showResults: true } : poll
              )
            );
            break;
          }

          case "reaction": {
            // Someone else's reaction. Your own is shown when you send it —
            // LiveKit does not echo a packet back to its publisher.
            // Both fields come from another participant and are rendered, so
            // they are trimmed to something an emoji fits in. Nothing else on
            // this channel is drawn straight from a peer.
            showReaction({
              emoji: String(event.emoji ?? "").slice(0, 8),
              label: String(event.label ?? "").slice(0, 32),
              from: event.from,
              timestamp: event.timestamp,
            });
            break;
          }
        }
      } catch (err) {
        // Silently ignore non-JSON payloads (e.g. LiveKit internal data)
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, showReaction]);

  // Clean up hands when participants leave
  useEffect(() => {
    const handleDisconnect = (participant: RemoteParticipant) => {
      setRaisedHands((prev) => prev.filter((h) => h.identity !== participant.identity));
    };

    room.on(RoomEvent.ParticipantDisconnected, handleDisconnect);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnect);
    };
  }, [room]);

  // ── Actions ─────────────────────────────────────────────────────────

  const toggleRaiseHand = useCallback(async () => {
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
      setRaisedHands((prev) => prev.filter((h) => h.identity !== room.localParticipant.identity));
    }

    // Optimistic, but not a lie: if the packet never left, put the button back
    // the way it was. A hand that reads "raised" while the host's queue is
    // empty is the worst of both — the member waits, and nobody is coming.
    const sent = await publish(event);
    if (sent) return;

    setHasRaisedHand(!newState);
    if (newState) {
      setRaisedHands((prev) => prev.filter((h) => h.identity !== room.localParticipant.identity));
    }
  }, [hasRaisedHand, room, publish]);

  /**
   * Send a reaction, and show your own.
   *
   * The publish used to live in `ReactionsBar`, reaching for the room context
   * on its own. It moved here because this hook is the room's data channel:
   * one place that knows how a packet is sent and what happens when it cannot
   * be. `ReactionsBar` is the row of buttons.
   */
  const sendReaction = useCallback(
    async (emoji: string, label: string) => {
      const event: DataChannelEvent = {
        type: "reaction",
        emoji,
        label,
        from: room.localParticipant.identity,
        timestamp: Date.now(),
      };

      // Shown only once it is really on the wire. Floating an emoji that the
      // room never received is the same lie as the raised hand above.
      const sent = await publish(event);
      if (!sent) return;

      showReaction({ emoji, label, from: event.from, timestamp: event.timestamp });
    },
    [room, publish, showReaction]
  );

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
          const alreadyVoted = poll.options.some((o) => o.voters.includes(voterId));
          if (alreadyVoted) return poll;

          return {
            ...poll,
            totalVotes: poll.totalVotes + 1,
            options: poll.options.map((o) =>
              o.id === optionId ? { ...o, votes: o.votes + 1, voters: [...o.voters, voterId] } : o
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
          poll.id === pollId ? { ...poll, isActive: false, showResults: true } : poll
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

    // Reactions
    reactions,
    sendReaction,

    // Moderation
    muteAll,
    muteAllSignal,

    // Speaker invite
    invitedToSpeak,
    clearSpeakerInvite: () => setInvitedToSpeak(false),
  };
}

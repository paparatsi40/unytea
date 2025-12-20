"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, MessageSquare, BarChart3, X } from "lucide-react";
import { RoomEvent } from "livekit-client";
import { LiveReactions } from "@/components/live-session/LiveReactions";
import { SegmentedChat, ChatMessage, ChatMessageType } from "@/components/live-session/SegmentedChat";
import { LivePoll, PollCreator, Poll } from "@/components/live-session/LivePoll";
import { Reaction, ReactionType, createReaction } from "@/lib/live-reactions";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedVideoCallProps {
  roomName: string;
  participantName: string;
  userId: string;
  onDisconnect?: () => void;
  isModerator?: boolean;
}

export function EnhancedVideoCall({
  roomName,
  participantName,
  userId,
  onDisconnect,
  isModerator = false,
}: EnhancedVideoCallProps) {
  const [token, setToken] = useState<string>("");
  const [wsUrl, setWsUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName,
            participantName,
            identity: userId, // Send userId as identity for unique connection
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to get access token");
        }

        const data = await response.json();
        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        console.error("Error fetching token:", err);
        setError(err instanceof Error ? err.message : "Failed to connect to video call");
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [roomName, participantName, userId]);

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Connecting to video call...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-red-50 dark:bg-red-900/20">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <X className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Connection Failed
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return null;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={onDisconnect}
    >
      <VideoCallInterface
        participantName={participantName}
        userId={userId}
        isModerator={isModerator}
      />
    </LiveKitRoom>
  );
}

/**
 * Internal component that has access to LiveKit room context
 */
interface VideoCallInterfaceProps {
  participantName: string;
  userId: string;
  isModerator: boolean;
}

function VideoCallInterface({
  participantName,
  userId,
  isModerator,
}: VideoCallInterfaceProps) {
  const room = useRoomContext();

  // State for Phase 1 features
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [pollRevision, setPollRevision] = useState(0); // Force re-render counter
  const [, setPinnedMessages] = useState<Set<string>>(new Set());
  const [, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [processedVotes, setProcessedVotes] = useState<Set<string>>(new Set()); // Track processed votes

  // UI State
  const [showChat, setShowChat] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);

  // Debug: Log activePoll changes
  useEffect(() => {
    if (activePoll) {
      console.log("🔵 activePoll state changed in EnhancedVideoCall:", {
        id: activePoll.id,
        totalVotes: activePoll.totalVotes,
        options: activePoll.options.map(o => ({
          text: o.text,
          votes: o.votes,
          voters: o.voters.length
        }))
      });
    }
  }, [activePoll]);

  // Listen to data channel messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant: any
    ) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));

        console.log("📡 Data received from participant:", participant?.identity, "Type:", message.type);

        switch (message.type) {
          case "reaction":
            handleReactionReceived(message.data);
            break;
          case "chat":
            handleChatMessageReceived(message.data);
            break;
          case "poll":
            handlePollReceived(message.data);
            break;
          case "vote":
            // Only process votes from OTHER participants, not from ourselves
            console.log("📊 Vote received from:", participant?.identity, "My ID:", userId);
            if (participant?.identity !== userId) {
              handleVoteReceived(message.data);
            } else {
              console.log("⏭️ Skipping own vote (already processed locally)");
            }
            break;
          case "pin":
            handlePinMessage(message.data.messageId);
            break;
          case "answer":
            handleMarkAnswered(message.data.messageId, message.data.answeredBy);
            break;
        }
      } catch (error) {
        console.error("Error parsing data message:", error);
      }
    };

    const handleParticipantConnected = (participant: any) => {
      console.log("👤 Participant connected:", participant.identity);
      
      // If we're the moderator and there's an active poll, send it to the new participant
      if (isModerator && activePoll) {
        console.log("📊 Sending active poll to new participant:", activePoll.id);
        setTimeout(() => {
          sendDataMessage("poll", activePoll, false); // Don't process locally, just broadcast
        }, 500); // Small delay to ensure they're ready to receive
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [room, userId, isModerator, activePoll]);

  // Handle incoming messages
  const handleReactionReceived = (reaction: Reaction) => {
    setReactions((prev) => [...prev, reaction]);
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 5 * 60 * 1000);
  };

  const handleChatMessageReceived = (message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  };

  const handlePollReceived = (poll: Poll) => {
    console.log("📊 Poll received:", poll.id, "Active poll:", activePoll?.id);
    
    // If it's the same poll, merge the state (to get updated votes)
    if (activePoll && activePoll.id === poll.id) {
      console.log("🔄 Updating existing poll with received state");
      setActivePoll({
        ...activePoll,
        ...poll,
      });
      setPollRevision((prev) => prev + 1);
    } else {
      // New poll, replace completely
      console.log("🆕 Setting new poll:", poll.id);
      setActivePoll(poll);
      setPollRevision((prev) => prev + 1);
      // Clear processed votes for new poll
      setProcessedVotes(new Set());
    }
  };

  const handleVoteReceived = (data: { pollId: string; optionId: string; userId: string }) => {
    console.log("📊 Vote received:", data);
    
    // Create unique vote ID
    const voteId = `${data.pollId}-${data.userId}`;
    
    // Check if already processed
    if (processedVotes.has(voteId)) {
      console.log("⚠️ Vote already processed, skipping duplicate:", voteId);
      return;
    }
    
    if (!activePoll || activePoll.id !== data.pollId) {
      console.log("❌ Vote ignored - no active poll or wrong poll ID");
      return;
    }

    console.log("📊 Current poll state:", {
      totalVotes: activePoll.totalVotes,
      options: activePoll.options.map(o => ({ id: o.id, text: o.text, votes: o.votes, voters: o.voters }))
    });

    setActivePoll((prev) => {
      if (!prev) return null;

      // Double-check if this user already voted (belt and suspenders)
      const userAlreadyVoted = prev.options.some((option) =>
        option.voters.includes(data.userId)
      );

      if (userAlreadyVoted) {
        console.log("⚠️ User already voted (found in voters array), ignoring duplicate:", data.userId);
        return prev;
      }

      const updatedOptions = prev.options.map((option) => {
        if (option.id === data.optionId) {
          console.log(`✅ Adding vote to option "${option.text}":`, {
            oldVotes: option.votes,
            newVotes: option.votes + 1,
            voters: [...option.voters, data.userId]
          });
          return {
            ...option,
            votes: option.votes + 1,
            voters: [...option.voters, data.userId],
          };
        }
        return option;
      });

      // Create a completely new object to force React to detect the change
      const newState = {
        id: prev.id,
        question: prev.question,
        options: updatedOptions,
        createdBy: prev.createdBy,
        createdByName: prev.createdByName,
        createdAt: prev.createdAt,
        endsAt: prev.endsAt,
        isActive: prev.isActive,
        totalVotes: prev.totalVotes + 1,
        correctAnswer: prev.correctAnswer,
        showResults: prev.showResults,
      };

      console.log("📊 Updated poll state:", {
        totalVotes: newState.totalVotes,
        options: newState.options.map(o => ({ id: o.id, text: o.text, votes: o.votes, voters: o.voters.length }))
      });

      setPollRevision((prev) => prev + 1);
      
      // Mark this vote as processed AFTER successfully updating
      setProcessedVotes((prev) => new Set([...prev, voteId]));
      
      return newState;
    });
  };

  const handlePinMessage = (messageId: string) => {
    setPinnedMessages((prev) => new Set(prev).add(messageId));
    
    // Update message in state
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isPinned: true } : msg
      )
    );
  };

  const handleMarkAnswered = (messageId: string, answeredBy: string) => {
    setAnsweredQuestions((prev) => new Set(prev).add(messageId));
    
    // Update message in state
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, isAnswered: true, answeredBy }
          : msg
      )
    );
  };

  // Send messages via data channel
  const sendDataMessage = (type: string, data: any, processLocally = true) => {
    if (!room) return;

    const message = JSON.stringify({ type, data });
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    room.localParticipant.publishData(encoded, {
      reliable: true,
    });

    // Process the message locally since we don't receive our own DataReceived events
    if (processLocally) {
      switch (type) {
        case "reaction":
          handleReactionReceived(data);
          break;
        case "chat":
          handleChatMessageReceived(data);
          break;
        case "poll":
          handlePollReceived(data);
          break;
        case "vote":
          handleVoteReceived(data);
          break;
        case "pin":
          handlePinMessage(data.messageId);
          break;
        case "answer":
          handleMarkAnswered(data.messageId, data.answeredBy);
          break;
      }
    }
  };

  // Handlers for user actions
  const handleReact = (type: ReactionType) => {
    const reaction = createReaction(type, userId, participantName);
    sendDataMessage("reaction", reaction);
  };

  const handleSendMessage = (content: string, messageType: ChatMessageType) => {
    const message: ChatMessage = {
      id: `${userId}-${Date.now()}-${Math.random()}`,
      type: messageType,
      content,
      userId,
      userName: participantName,
      timestamp: Date.now(),
    };
    
    sendDataMessage("chat", message);
  };

  const handleCreatePoll = (
    question: string,
    options: string[],
    duration?: number,
    correctAnswer?: string
  ) => {
    const poll: Poll = {
      id: `poll-${Date.now()}`,
      question,
      options: options.map((text) => ({
        id: `opt-${Math.random()}`,
        text,
        votes: 0,
        voters: [],
      })),
      createdBy: userId,
      createdByName: participantName,
      createdAt: Date.now(),
      endsAt: duration ? Date.now() + duration * 1000 : undefined,
      isActive: true,
      totalVotes: 0,
      correctAnswer: correctAnswer,
      showResults: false,
    };

    sendDataMessage("poll", poll);
    setActivePoll(poll);
    setPollRevision((prev) => prev + 1);
    setShowPollCreator(false);
  };

  const handleVote = (pollId: string, optionId: string) => {
    const data = { pollId, optionId, userId };
    sendDataMessage("vote", data); 
  };

  const handlePinMessageAction = (messageId: string) => {
    sendDataMessage("pin", { messageId });
  };

  const handleMarkAnsweredAction = (messageId: string) => {
    sendDataMessage("answer", { messageId, answeredBy: participantName });
  };

  return (
    <div className="relative h-full">
      {/* Main Video Conference */}
      <div className="h-full">
        <VideoConference />
        <RoomAudioRenderer />
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-50">
        {/* Chat Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowChat(!showChat)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-colors ${
            showChat
              ? "bg-purple-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {chatMessages.length > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {chatMessages.length > 9 ? "9+" : chatMessages.length}
            </span>
          )}
        </motion.button>

        {/* Poll Creator (Moderator only) */}
        {isModerator && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPollCreator(!showPollCreator)}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <BarChart3 className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Reactions (Always visible) */}
      <div className="absolute bottom-4 right-4 z-50">
        <LiveReactions reactions={reactions} onReact={handleReact} showPicker={true} />
      </div>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className="absolute top-0 left-0 bottom-0 w-96 z-40"
          >
            <SegmentedChat
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onPinMessage={isModerator ? handlePinMessageAction : undefined}
              onMarkAnswered={isModerator ? handleMarkAnsweredAction : undefined}
              isModerator={isModerator}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Poll Overlay */}
      {activePoll && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <LivePoll
            poll={activePoll}
            currentUserId={userId}
            onVote={handleVote}
            onClose={() => setActivePoll(null)}
            key={pollRevision}
          />
        </div>
      )}

      {/* Poll Creator Modal */}
      <AnimatePresence>
        {showPollCreator && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <PollCreator
              onCreatePoll={handleCreatePoll}
              onClose={() => setShowPollCreator(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

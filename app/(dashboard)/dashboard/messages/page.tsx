"use client";

import { useState } from "react";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";

interface OtherUser {
  id: string;
  name?: string | null;
  firstName?: string | null;
  username?: string | null;
  image?: string | null;
}

export default function MessagesPage() {
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [activeOtherUser, setActiveOtherUser] = useState<OtherUser | undefined>();

  const handleSelectConversation = (conversationId: string, otherUser: OtherUser) => {
    setActiveConversationId(conversationId);
    setActiveOtherUser(otherUser);
  };

  const handleNewMessage = () => {
    // TODO: Open modal to select user and create new conversation
    alert("New message feature coming soon!");
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar with conversation list */}
      <ConversationList
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewMessage={handleNewMessage}
      />

      {/* Main chat area */}
      {activeConversationId && activeOtherUser ? (
        <MessageThread
          conversationId={activeConversationId}
          otherUser={activeOtherUser}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
              <span className="text-5xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Your Messages
            </h2>
            <p className="text-white/60 max-w-md mb-6">
              Select a conversation from the left to start chatting, or click the + button to start a new conversation.
            </p>
            <button
              onClick={handleNewMessage}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
            >
              Start New Conversation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

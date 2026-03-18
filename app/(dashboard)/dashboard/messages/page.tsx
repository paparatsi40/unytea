"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { getOrCreateConversation } from "@/app/actions/messages";

interface OtherUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [activeOtherUser, setActiveOtherUser] = useState<OtherUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  const handleSelectConversation = (conversationId: string, otherUser: OtherUser) => {
    setActiveConversationId(conversationId);
    setActiveOtherUser(otherUser);
  };

  const handleNewMessage = () => {
    // TODO: Open modal to select user and create new conversation
    alert("New message feature coming soon!");
  };

  useEffect(() => {
    const userId = searchParams.get("user");
    const communityId = searchParams.get("community");

    if (!userId || activeConversationId || bootstrapping) return;

    const bootstrapConversation = async () => {
      setBootstrapping(true);
      const result = await getOrCreateConversation(userId, communityId || undefined);

      if (result.success && result.conversation) {
        const otherUser =
          result.conversation.participant1.id === userId
            ? result.conversation.participant1
            : result.conversation.participant2;

        setActiveConversationId(result.conversation.id);
        setActiveOtherUser(otherUser);
      }

      setBootstrapping(false);
    };

    bootstrapConversation();
  }, [searchParams, activeConversationId, bootstrapping]);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <ConversationList
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewMessage={handleNewMessage}
      />

      {activeConversationId && activeOtherUser ? (
        <>
          <MessageThread conversationId={activeConversationId} otherUser={activeOtherUser} />

          <aside className="hidden xl:flex w-80 border-l border-white/10 bg-zinc-950/40 p-5 flex-col gap-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">Contact</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex items-center justify-center text-white font-semibold">
                  {activeOtherUser.image ? (
                    <img
                      src={activeOtherUser.image}
                      alt={activeOtherUser.name || "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (activeOtherUser.firstName || activeOtherUser.name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {activeOtherUser.firstName || activeOtherUser.name || "User"}
                  </p>
                  {activeOtherUser.username && (
                    <p className="text-xs text-white/50">@{activeOtherUser.username}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">Context</p>
              <p className="mt-2 text-sm text-white/80">Direct conversation</p>
              <p className="mt-1 text-xs text-white/50">Started from inbox or community members.</p>
            </div>
          </aside>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
              <span className="text-5xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Your Messages</h2>
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

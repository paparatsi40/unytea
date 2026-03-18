"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { getOrCreateConversation, getSharedMessageContext, searchMessageCandidates } from "@/app/actions/messages";
import { useToast } from "@/hooks/use-toast";

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
  const [unreadTotal, setUnreadTotal] = useState(0);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [candidates, setCandidates] = useState<OtherUser[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [inboxRefreshToken, setInboxRefreshToken] = useState(0);
  const [sharedCommunities, setSharedCommunities] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const { toast } = useToast();

  const handleSelectConversation = (conversationId: string, otherUser: OtherUser) => {
    setActiveConversationId(conversationId);
    setActiveOtherUser(otherUser);
    setIsMobileThreadOpen(true);
  };

  const handleNewMessage = () => {
    setComposerError("");
    setIsComposerOpen(true);
  };

  const handleStartConversation = async (user: OtherUser) => {
    setComposerError("");
    const result = await getOrCreateConversation(user.id);

    if (result.success && result.conversation) {
      const otherUser =
        result.conversation.participant1.id === user.id
          ? result.conversation.participant1
          : result.conversation.participant2;

      setActiveConversationId(result.conversation.id);
      setActiveOtherUser(otherUser);
      setIsMobileThreadOpen(true);
      setIsComposerOpen(false);
      setCandidateQuery("");
      setCandidates([]);
      return;
    }

    const errorMessage = result.error || "Could not start this conversation.";
    setComposerError(errorMessage);
    toast({
      title: "Cannot start conversation",
      description: errorMessage,
      variant: "destructive",
    });
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
        setIsMobileThreadOpen(true);
      }

      setBootstrapping(false);
    };

    bootstrapConversation();
  }, [searchParams, activeConversationId, bootstrapping]);

  useEffect(() => {
    if (!isComposerOpen) return;

    const run = async () => {
      if (!candidateQuery.trim()) {
        setCandidates([]);
        return;
      }

      setIsSearchingCandidates(true);
      setComposerError("");
      const result = await searchMessageCandidates(candidateQuery);
      if (result.success && result.users) {
        setCandidates(result.users);
      } else if (!result.success) {
        setComposerError(result.error || "Could not load members.");
      }
      setIsSearchingCandidates(false);
    };

    const timeout = setTimeout(run, 250);
    return () => clearTimeout(timeout);
  }, [candidateQuery, isComposerOpen]);

  useEffect(() => {
    if (!activeOtherUser?.id) {
      setSharedCommunities([]);
      return;
    }

    const loadSharedContext = async () => {
      const result = await getSharedMessageContext(activeOtherUser.id);
      if (result.success && result.sharedCommunities) {
        setSharedCommunities(result.sharedCommunities);
      }
    };

    loadSharedContext();
  }, [activeOtherUser?.id]);

  const handleMobileBack = () => {
    setIsMobileThreadOpen(false);
  };

  const handleConversationRead = () => {
    setInboxRefreshToken((prev) => prev + 1);
  };

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex">
        <div className={`${isMobileThreadOpen ? "hidden" : "flex"} md:flex w-full md:w-auto`}>
          <ConversationList
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewMessage={handleNewMessage}
            onUnreadTotalChange={setUnreadTotal}
            refreshToken={inboxRefreshToken}
          />
        </div>

        {activeConversationId && activeOtherUser ? (
          <>
            <div className={`${isMobileThreadOpen ? "flex" : "hidden"} md:flex flex-1 min-w-0`}>
              <MessageThread
                conversationId={activeConversationId}
                otherUser={activeOtherUser}
                subtitle={sharedCommunities.length > 0 ? `Shared communities: ${sharedCommunities.length}` : "Direct conversation"}
                onBack={handleMobileBack}
                showBackButton
                onConversationRead={handleConversationRead}
              />
            </div>

            <aside className="hidden xl:flex w-80 border-l border-gray-200 bg-white p-5 flex-col gap-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>
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
                    <p className="text-sm font-semibold text-gray-900">
                      {activeOtherUser.firstName || activeOtherUser.name || "User"}
                    </p>
                    {activeOtherUser.username && (
                      <p className="text-xs text-gray-500">@{activeOtherUser.username}</p>
                    )}
                  </div>
                </div>

                {activeOtherUser.username ? (
                  <Link
                    href={`/u/${activeOtherUser.username}`}
                    className="mt-3 inline-flex rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View profile
                  </Link>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Context</p>
                <p className="mt-2 text-sm text-gray-900">Direct conversation</p>
                <p className="mt-1 text-xs text-gray-500">Started from inbox or community members.</p>

                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Communities in common</p>
                  {sharedCommunities.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sharedCommunities.slice(0, 3).map((community) => (
                        <span key={community.id} className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-800">
                          {community.name}
                        </span>
                      ))}
                      {sharedCommunities.length > 3 ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                          +{sharedCommunities.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">No active shared communities found.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs uppercase tracking-wide text-purple-700">Unread</p>
                <p className="mt-2 text-2xl font-bold text-purple-900">{unreadTotal}</p>
                <p className="text-xs text-purple-700/80">total unread messages in your inbox</p>
              </div>
            </aside>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                <span className="text-5xl">💬</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Messages</h2>
              <p className="text-gray-600 max-w-md mb-6">
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

      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">Start new conversation</h3>
              <button
                onClick={() => {
                  setComposerError("");
                  setIsComposerOpen(false);
                }}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              {composerError ? (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {composerError}
                </div>
              ) : null}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  placeholder="Search member by name or username"
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                />
              </div>

              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {isSearchingCandidates ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">Type to search members.</p>
                ) : (
                  candidates.map((candidate) => {
                    const displayName =
                      candidate.firstName || candidate.name || candidate.username || "User";
                    return (
                      <button
                        key={candidate.id}
                        onClick={() => handleStartConversation(candidate)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-left hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                            {candidate.image ? (
                              <img
                                src={candidate.image}
                                alt={displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
                            {candidate.username && (
                              <p className="truncate text-xs text-gray-500">@{candidate.username}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import {
  getOrCreateConversation,
  getSharedMessageContext,
} from "@/app/actions/messages";

interface OtherUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [activeOtherUser, setActiveOtherUser] = useState<OtherUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [inboxRefreshToken, setInboxRefreshToken] = useState(0);
  const [sharedCommunities, setSharedCommunities] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);

  const handleSelectConversation = (conversationId: string, otherUser: OtherUser) => {
    setActiveConversationId(conversationId);
    setActiveOtherUser(otherUser);
    setIsMobileThreadOpen(true);
  };

  useEffect(() => {
    const userId = searchParams?.get("user");
    const communityId = searchParams?.get("community");

    if (!userId || activeConversationId || bootstrapping) return;

    // PD V1 §5 Cat B: communityId is required to scope the host↔member pair.
    // Without it, redirect back to inbox base — no creation path without context.
    if (!communityId) {
      router.replace("/dashboard/messages");
      return;
    }

    const bootstrapConversation = async () => {
      setBootstrapping(true);
      const result = await getOrCreateConversation(userId, communityId);

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
  }, [searchParams, activeConversationId, bootstrapping, router]);

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
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <div className={`${isMobileThreadOpen ? "hidden" : "flex"} w-full md:flex md:w-auto`}>
        <ConversationList
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onUnreadTotalChange={setUnreadTotal}
          refreshToken={inboxRefreshToken}
        />
      </div>

      {activeConversationId && activeOtherUser ? (
        <>
          <div className={`${isMobileThreadOpen ? "flex" : "hidden"} min-w-0 flex-1 md:flex`}>
            <div className="flex min-w-0 flex-1 justify-center">
              <div className="flex w-full min-w-0 max-w-[980px]">
                <MessageThread
                  conversationId={activeConversationId}
                  otherUser={activeOtherUser}
                  subtitle={
                    sharedCommunities.length > 0
                      ? `Shared communities: ${sharedCommunities.length}`
                      : "Direct conversation"
                  }
                  onBack={handleMobileBack}
                  showBackButton
                  onConversationRead={handleConversationRead}
                />
              </div>
            </div>
          </div>

          <aside className="hidden w-[300px] shrink-0 border-l border-gray-200 bg-white p-4 xl:flex xl:flex-col xl:gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>

              <div className="mt-2.5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 font-semibold text-white">
                  {activeOtherUser.image ? (
                    <img
                      src={activeOtherUser.image}
                      alt={activeOtherUser.name || "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (activeOtherUser.firstName || activeOtherUser.name || "U")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {activeOtherUser.firstName || activeOtherUser.name || "User"}
                  </p>
                  {activeOtherUser.username && (
                    <p className="truncate text-xs text-gray-500">
                      @{activeOtherUser.username}
                    </p>
                  )}
                </div>
              </div>

              <Link
                href={activeOtherUser.username ? `/u/${activeOtherUser.username}` : "/dashboard/messages"}
                className={`mt-3 inline-flex rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeOtherUser.username
                    ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "pointer-events-none border-gray-200 text-gray-400"
                }`}
                aria-disabled={!activeOtherUser.username}
                title={activeOtherUser.username ? "View profile" : "Profile unavailable"}
              >
                View profile
              </Link>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Context</p>
              <p className="mt-2 text-sm font-medium text-gray-900">Direct conversation</p>
              <p className="mt-1 text-xs text-gray-500">
                Started from community members.
              </p>

              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  Communities in common
                </p>

                {sharedCommunities.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sharedCommunities.slice(0, 3).map((community) => (
                      <span
                        key={community.id}
                        className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-800"
                      >
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
                  <p className="mt-2 text-xs text-gray-500">
                    No active shared communities found.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50 p-3.5">
              <p className="text-xs uppercase tracking-wide text-purple-700">Unread</p>
              <p className="mt-2 text-2xl font-bold text-purple-900">{unreadTotal}</p>
              <p className="text-xs text-purple-700/80">
                total unread messages in your inbox
              </p>
            </div>
          </aside>
        </>
      ) : (
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/15">
              <span className="text-4xl">💬</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Your Messages
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600">
              Select a conversation from the left to view it. To start a new
              conversation, open a community member directory and use the
              Message button there.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

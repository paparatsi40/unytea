import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizePrivateChannel } from "@/lib/pusher-server";

export const dynamic = "force-dynamic";

/**
 * Pusher private-channel authorization.
 *
 * SEC-06. This handler used to parse `private-channel-(\w+)`, assign the id to
 * `_channelId`, then `void _channelId` under a comment claiming "channel ID
 * validated". It was not: every authenticated user was authorized for every
 * private channel, so any account could subscribe to any community's chat or
 * to a stranger's DM thread simply by naming it.
 *
 * The id is polymorphic — the client subscribes with either a community
 * `Channel.id` (components/chat/PusherChat.tsx) or a `Conversation.id`
 * (components/messages/MessageThread.tsx) — so both shapes are resolved and
 * each has its own rule:
 *   - Channel      → the caller must be an ACTIVE member of its community.
 *   - Conversation → the caller must be one of the two participants.
 * Anything that resolves to neither is refused.
 *
 * The companion `PUT` handler that let a client trigger an arbitrary event on
 * an arbitrary channel has been deleted; realtime is emitted only from server
 * code that already authorized the write (see lib/pusher-server.ts).
 */

const CHANNEL_NAME = /^private-channel-([A-Za-z0-9_-]+)$/;

type Access = { allowed: true } | { allowed: false; reason: string };

/**
 * Can this user subscribe to the realtime channel identified by `id`?
 *
 * Exported for tests: the decision is the whole of SEC-06, and it is worth
 * asserting directly rather than only through the HTTP shell.
 */
export async function canAccessRealtimeChannel(id: string, userId: string): Promise<Access> {
  const channel = await prisma.channel.findUnique({
    where: { id },
    select: { communityId: true },
  });

  if (channel) {
    const membership = await prisma.member.findUnique({
      where: { userId_communityId: { userId, communityId: channel.communityId } },
      select: { status: true },
    });
    return membership?.status === "ACTIVE"
      ? { allowed: true }
      : { allowed: false, reason: "not an active member of this community" };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { participant1Id: true, participant2Id: true },
  });

  if (conversation) {
    const isParticipant =
      conversation.participant1Id === userId || conversation.participant2Id === userId;
    return isParticipant
      ? { allowed: true }
      : { allowed: false, reason: "not a participant in this conversation" };
  }

  // Neither a channel nor a conversation: refuse rather than fall through.
  return { allowed: false, reason: "unknown channel" };
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.formData();
  const socketId = body.get("socket_id");
  const channel = body.get("channel_name");

  if (typeof socketId !== "string" || typeof channel !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const match = channel.match(CHANNEL_NAME);
  if (!match) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const access = await canAccessRealtimeChannel(match[1], session.user.id);
  if (!access.allowed) {
    // Deliberately generic to the caller; the reason stays server-side.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only reached once access is proven.
  const authResponse = authorizePrivateChannel(socketId, channel, {
    id: session.user.id,
    name: session.user.name,
  });

  return NextResponse.json(authResponse);
}

"use server";

import { z } from "zod";
import { postAttachmentsSchema } from "@/lib/attachments";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { defineAction } from "@/lib/actions/define-action";
import {
  communityById,
  communityOfChannel,
  communityOfChannelMessage,
} from "@/lib/actions/resolvers";
import { emitRealtime } from "@/lib/pusher-server";

/**
 * Community chat channels.
 *
 * SEC-02b: `getChannelMessages` had no authentication and an unclamped
 * caller-supplied `limit`, so anyone holding a channelId could read the entire
 * message history of any community's channel in a single call.
 * `getOrCreateDefaultChannels` had none either — and it writes, creating four
 * channels in any community on demand.
 * `sendChannelMessage` authenticated but never checked membership, so any
 * signed-in user could post into any community.
 *
 * Every export now resolves the owning community and requires ACTIVE membership.
 */

const channelIdSchema = z.string().min(1).max(64);
const communityIdSchema = z.string().min(1).max(64);
const messageIdSchema = z.string().min(1).max(64);

const DEFAULT_CHANNELS = [
  {
    name: "General",
    slug: "general",
    emoji: "💬",
    position: 0,
    description: "General discussions",
  },
  {
    name: "Announcements",
    slug: "announcements",
    emoji: "📢",
    position: 1,
    description: "Important updates",
  },
  { name: "Questions", slug: "questions", emoji: "❓", position: 2, description: "Ask anything" },
  { name: "Random", slug: "random", emoji: "🎲", position: 3, description: "Off-topic chat" },
];

const PROVISIONING_ROLES = ["OWNER", "ADMIN", "MODERATOR"] as const;

/**
 * Read a community's channels.
 *
 * Was `getOrCreateDefaultChannels`: a `member`-gated read that silently *created*
 * four channel rows whenever a community had none, so an ordinary member could
 * trigger provisioning — including re-creating defaults an admin had deliberately
 * removed (L1). Provisioning now lives in its own admin-gated action below.
 *
 * `canProvision` lets the UI offer that action only to callers who may perform
 * it, instead of firing a request that would predictably be refused.
 */
export const getCommunityChannels = defineAction(
  {
    name: "getCommunityChannels",
    auth: "member",
    args: [communityIdSchema],
    community: ([communityId]) => communityById(communityId),
  },
  async (ctx, communityId) => {
    const channels = await prisma.channel.findMany({
      where: { communityId },
      orderBy: { position: "asc" },
      take: 100,
    });

    const role = ctx.member?.role;
    const canProvision = role != null && (PROVISIONING_ROLES as readonly string[]).includes(role);

    return { success: true as const, channels, canProvision };
  }
);

/**
 * Create the default channel set for a community that has none.
 *
 * Idempotent: a community that already has channels is left untouched.
 */
export const provisionDefaultChannels = defineAction(
  {
    name: "provisionDefaultChannels",
    auth: "admin",
    args: [communityIdSchema],
    community: ([communityId]) => communityById(communityId),
    roles: [...PROVISIONING_ROLES],
    rateLimit: "create",
  },
  async (_ctx, communityId) => {
    const existing = await prisma.channel.findMany({
      where: { communityId },
      orderBy: { position: "asc" },
      take: 100,
    });

    if (existing.length > 0) {
      return { success: true as const, channels: existing, created: false };
    }

    await prisma.channel.createMany({
      data: DEFAULT_CHANNELS.map((channel) => ({ ...channel, communityId })),
      skipDuplicates: true,
    });

    const channels = await prisma.channel.findMany({
      where: { communityId },
      orderBy: { position: "asc" },
      take: 100,
    });

    return { success: true as const, channels, created: true };
  }
);

export const getChannelMessages = defineAction(
  {
    name: "getChannelMessages",
    auth: "member",
    args: [channelIdSchema, z.number().int().min(1).max(100).default(50)],
    community: ([channelId]) => communityOfChannel(channelId),
  },
  async (_ctx, channelId, limit) => {
    const messages = await prisma.channelMessage.findMany({
      where: { channelId },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true as const, messages: messages.reverse() };
  }
);

export const sendChannelMessage = defineAction(
  {
    name: "sendChannelMessage",
    auth: "member",
    args: [channelIdSchema, z.string().max(10_000), postAttachmentsSchema.optional()],
    community: ([channelId]) => communityOfChannel(channelId),
    rateLimit: "message",
  },
  async (ctx, channelId, content, attachments) => {
    if (!content.trim() && !attachments) {
      return { success: false as const, error: "Message cannot be empty" };
    }

    const message = await prisma.channelMessage.create({
      data: {
        content: content.trim(),
        attachments: attachments ? (attachments as Prisma.InputJsonValue) : Prisma.JsonNull,
        authorId: ctx.userId,
        channelId,
      },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    // Realtime is emitted here, after the seam has proven membership — not by
    // the client. The old path had PusherChat POST straight to a free-form
    // trigger endpoint, which both bypassed authorization (SEC-06) and never
    // persisted the message.
    await emitRealtime(channelId, "message", {
      id: message.id,
      content: message.content,
      senderId: ctx.userId,
      senderName: message.author.name || "User",
      timestamp: message.createdAt.toISOString(),
      channelId,
    });

    revalidatePath("/dashboard/c/[slug]/chat/[channel]", "page");

    return { success: true as const, message };
  }
);

export const deleteChannelMessage = defineAction(
  {
    name: "deleteChannelMessage",
    auth: "member",
    args: [messageIdSchema],
    community: ([messageId]) => communityOfChannelMessage(messageId),
  },
  async (ctx, messageId) => {
    const message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { authorId: true, channelId: true },
    });

    if (!message) {
      return { success: false as const, error: "Message not found" };
    }

    // Author, or a moderator of the community the channel belongs to.
    const isModerator =
      ctx.member != null && ["OWNER", "ADMIN", "MODERATOR"].includes(ctx.member.role);
    if (message.authorId !== ctx.userId && !isModerator) {
      return { success: false as const, error: "Unauthorized" };
    }

    await prisma.channelMessage.delete({ where: { id: messageId } });

    await emitRealtime(message.channelId, "message:deleted", { messageId });

    revalidatePath("/dashboard/c/[slug]/chat/[channel]", "page");

    return { success: true as const };
  }
);

export const updateChannelPresence = defineAction(
  {
    name: "updateChannelPresence",
    auth: "member",
    args: [channelIdSchema, z.boolean()],
    community: ([channelId]) => communityOfChannel(channelId),
    // Polled on a 5s heartbeat by the chat page, so it needs the lenient bucket.
    rateLimit: "general",
  },
  async (ctx, channelId, isOnline) => {
    await prisma.channelMember.upsert({
      where: { userId_channelId: { userId: ctx.userId, channelId } },
      create: { userId: ctx.userId, channelId, isOnline, lastSeenAt: new Date() },
      update: { isOnline, lastSeenAt: new Date() },
    });
    return { success: true as const };
  }
);

export const setTypingStatus = defineAction(
  {
    name: "setTypingStatus",
    auth: "member",
    args: [channelIdSchema, z.boolean()],
    community: ([channelId]) => communityOfChannel(channelId),
    rateLimit: "message",
  },
  async (ctx, channelId, isTyping) => {
    await prisma.channelMember.upsert({
      where: { userId_channelId: { userId: ctx.userId, channelId } },
      create: {
        userId: ctx.userId,
        channelId,
        isTyping,
        lastTypingAt: isTyping ? new Date() : null,
      },
      update: { isTyping, lastTypingAt: isTyping ? new Date() : null },
    });
    return { success: true as const };
  }
);

export const getChannelOnlineMembers = defineAction(
  {
    name: "getChannelOnlineMembers",
    auth: "member",
    args: [channelIdSchema],
    community: ([channelId]) => communityOfChannel(channelId),
  },
  async (_ctx, channelId) => {
    const onlineThreshold = new Date(Date.now() - 10_000);
    const members = await prisma.channelMember.findMany({
      where: { channelId, lastSeenAt: { gte: onlineThreshold } },
      include: { user: { select: { id: true, name: true, image: true } } },
      take: 500,
    });
    return { success: true as const, members };
  }
);

export const getTypingUsers = defineAction(
  {
    name: "getTypingUsers",
    auth: "member",
    args: [channelIdSchema],
    community: ([channelId]) => communityOfChannel(channelId),
    rateLimit: "general",
  },
  async (_ctx, channelId) => {
    const typingMembers = await prisma.channelMember.findMany({
      where: {
        channelId,
        isTyping: true,
        lastTypingAt: { gte: new Date(Date.now() - 5000) },
      },
      include: { user: { select: { id: true, name: true } } },
      take: 50,
    });
    return { success: true as const, users: typingMembers.map((m) => m.user) };
  }
);

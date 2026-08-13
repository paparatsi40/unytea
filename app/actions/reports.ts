"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";
import { defineAction } from "@/lib/actions/define-action";
import { communityOfReport } from "@/lib/actions/resolvers";

/**
 * Content reporting and the moderation queue.
 *
 * SEC-09: `resolveReport` and `getReports` both carried
 * `// TODO: Add permission check to ensure user is admin/moderator`, and neither
 * ever got one. Any authenticated account could read the entire moderation
 * queue and resolve or dismiss any report — including every report filed against
 * itself — with the audit trail recording the abuser as the resolver.
 *
 * The Report model has no `communityId`; it stores a `targetType` plus loose
 * post/comment/user/message ids. `communityOfReport` walks to the owning
 * community through the reported artefact. USER and MESSAGE reports have no
 * community at all, so they resolve to null and only platform staff can action
 * them — which is what `allowPlatformAdmin` expresses.
 */

const reportIdSchema = z.string().min(1).max(64);
const targetIdSchema = z.string().min(1).max(64).optional();

export interface ReportWithRelations {
  id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  targetType: ReportTargetType;
  postId: string | null;
  commentId: string | null;
  userId: string | null;
  messageId: string | null;
  reporterId: string;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createReport = defineAction(
  {
    name: "createReport",
    auth: "user",
    args: [
      z.object({
        targetType: z.nativeEnum(ReportTargetType),
        reason: z.nativeEnum(ReportReason),
        postId: targetIdSchema,
        commentId: targetIdSchema,
        userId: targetIdSchema,
        messageId: targetIdSchema,
        description: z.string().max(5000).optional(),
      }),
    ],
    rateLimit: "create",
  },
  async (ctx, data) => {
    const hasTarget = data.postId || data.commentId || data.userId || data.messageId;
    if (!hasTarget) {
      return { success: false as const, error: "You must specify what you are reporting" };
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: ctx.userId,
        targetType: data.targetType,
        postId: data.postId || undefined,
        commentId: data.commentId || undefined,
        userId: data.userId || undefined,
        messageId: data.messageId || undefined,
        status: { in: ["PENDING", "REVIEWING"] },
      },
    });

    if (existingReport) {
      return { success: false as const, error: "You have already reported this content" };
    }

    const report = await prisma.report.create({
      data: {
        targetType: data.targetType,
        reason: data.reason,
        description: data.description,
        reporterId: ctx.userId,
        postId: data.postId,
        commentId: data.commentId,
        userId: data.userId,
        messageId: data.messageId,
      },
    });

    return { success: true as const, data: report };
  }
);

/**
 * The moderation queue for one community.
 *
 * `communityId` is now required. It used to be `_communityId` — accepted and
 * discarded — so the query returned every report on the platform to any
 * authenticated caller.
 */
export const getReports = defineAction(
  {
    name: "getReports",
    auth: "admin",
    args: [
      z.string().min(1).max(64),
      z.nativeEnum(ReportStatus).optional(),
    ],
    community: ([communityId]) => communityId,
    roles: ["OWNER", "ADMIN", "MODERATOR"],
    allowPlatformAdmin: true,
  },
  async (_ctx, communityId, status) => {
    // Scope to artefacts belonging to this community.
    const [postIds, commentIds] = await Promise.all([
      prisma.post.findMany({ where: { communityId }, select: { id: true }, take: 5000 }),
      prisma.comment.findMany({
        where: { post: { communityId } },
        select: { id: true },
        take: 5000,
      }),
    ]);

    const reports = await prisma.report.findMany({
      where: {
        ...(status ? { status } : {}),
        OR: [
          { postId: { in: postIds.map((p) => p.id) } },
          { commentId: { in: commentIds.map((c) => c.id) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return { success: true as const, data: reports };
  }
);

export const resolveReport = defineAction(
  {
    name: "resolveReport",
    auth: "admin",
    args: [reportIdSchema, z.string().max(5000), z.enum(["RESOLVED", "DISMISSED"])],
    community: ([reportId]) => communityOfReport(reportId),
    roles: ["OWNER", "ADMIN", "MODERATOR"],
    allowPlatformAdmin: true,
  },
  async (ctx, reportId, resolution, status) => {
    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as ReportStatus,
        resolution,
        resolvedBy: ctx.userId,
        resolvedAt: new Date(),
      },
    });

    return { success: true as const, data: report };
  }
);

export const getReportById = defineAction(
  {
    name: "getReportById",
    auth: "admin",
    args: [reportIdSchema],
    community: ([reportId]) => communityOfReport(reportId),
    roles: ["OWNER", "ADMIN", "MODERATOR"],
    allowPlatformAdmin: true,
  },
  async (_ctx, reportId) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return { success: false as const, error: "Report not found" };
    }
    return { success: true as const, data: report };
  }
);

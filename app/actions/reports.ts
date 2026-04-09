'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth-utils';
import { ReportReason, ReportStatus, ReportTargetType } from '@prisma/client';

export interface CreateReportInput {
  targetType: ReportTargetType;
  reason: ReportReason;
  postId?: string;
  commentId?: string;
  userId?: string;
  messageId?: string;
  description?: string;
}

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
  reporter?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

/**
 * Create a new report
 * Prevents duplicate reports from the same user on the same target
 */
export async function createReport(data: CreateReportInput) {
  try {
    const reporterId = await getCurrentUserId();

    if (!reporterId) {
      return {
        success: false,
        error: 'You must be authenticated to report content',
      };
    }

    // Validate that at least one target is specified
    const hasTarget =
      data.postId || data.commentId || data.userId || data.messageId;
    if (!hasTarget) {
      return {
        success: false,
        error: 'You must specify what you are reporting',
      };
    }

    // Check for duplicate reports from the same user on the same target
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType: data.targetType,
        postId: data.postId || undefined,
        commentId: data.commentId || undefined,
        userId: data.userId || undefined,
        messageId: data.messageId || undefined,
        status: {
          in: ['PENDING', 'REVIEWING'],
        },
      },
    });

    if (existingReport) {
      return {
        success: false,
        error: 'You have already reported this content',
      };
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        targetType: data.targetType,
        reason: data.reason,
        description: data.description,
        reporterId,
        postId: data.postId,
        commentId: data.commentId,
        userId: data.userId,
        messageId: data.messageId,
      },
    });

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    console.error('[createReport] Error:', error);
    return {
      success: false,
      error: 'Failed to create report',
    };
  }
}

/**
 * Get reports (for admins/moderators)
 * Optionally filter by status
 */
export async function getReports(
  status?: ReportStatus | string,
  _communityId?: string
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        error: 'You must be authenticated',
      };
    }

    // TODO: Add permission check to ensure user is admin/moderator
    // You may want to add checks like:
    // const user = await prisma.user.findUnique({ where: { id: userId }, include: { ... } })
    // if (!isAdmin) throw new Error('Unauthorized');

    const reports = await prisma.report.findMany({
      where: {
        ...(status && { status: status as ReportStatus }),
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: reports,
    };
  } catch (error) {
    console.error('[getReports] Error:', error);
    return {
      success: false,
      error: 'Failed to fetch reports',
    };
  }
}

/**
 * Resolve a report
 */
export async function resolveReport(
  reportId: string,
  resolution: string,
  status: 'RESOLVED' | 'DISMISSED'
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        error: 'You must be authenticated',
      };
    }

    // TODO: Add permission check to ensure user is admin/moderator
    // const user = await prisma.user.findUnique({ where: { id: userId }, include: { ... } })
    // if (!isAdmin) throw new Error('Unauthorized');

    // Validate status
    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
      return {
        success: false,
        error: 'Invalid status. Must be RESOLVED or DISMISSED',
      };
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as ReportStatus,
        resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    console.error('[resolveReport] Error:', error);
    return {
      success: false,
      error: 'Failed to resolve report',
    };
  }
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        error: 'You must be authenticated',
      };
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!report) {
      return {
        success: false,
        error: 'Report not found',
      };
    }

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    console.error('[getReportById] Error:', error);
    return {
      success: false,
      error: 'Failed to fetch report',
    };
  }
}

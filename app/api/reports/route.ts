import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimiters } from '@/lib/rate-limit';
import { z } from 'zod';
import {
  ReportReason,
  ReportTargetType,
  ReportStatus,
} from '@prisma/client';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createReportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'USER', 'MESSAGE']),
  reason: z.enum([
    'SPAM',
    'HARASSMENT',
    'HATE_SPEECH',
    'MISINFORMATION',
    'INAPPROPRIATE_CONTENT',
    'SELF_HARM',
    'VIOLENCE',
    'COPYRIGHT',
    'OTHER',
  ]),
  postId: z.string().optional(),
  commentId: z.string().optional(),
  userId: z.string().optional(),
  messageId: z.string().optional(),
  description: z.string().max(1000).optional(),
});

// ============================================
// POST HANDLER - Create a report
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Get session/auth
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you must be logged in' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limit by user ID
    const identifier = `report:${userId}`;
    const rateLimitResult = await rateLimiters.create.check(identifier);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    let data;
    try {
      const body = await request.json();
      data = createReportSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate that at least one target is specified
    const hasTarget =
      data.postId || data.commentId || data.userId || data.messageId;
    if (!hasTarget) {
      return NextResponse.json(
        { error: 'You must specify what you are reporting' },
        { status: 400 }
      );
    }

    // Check for duplicate reports from the same user on the same target
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        targetType: data.targetType as ReportTargetType,
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
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 409 }
      );
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        targetType: data.targetType as ReportTargetType,
        reason: data.reason as ReportReason,
        description: data.description,
        reporterId: userId,
        postId: data.postId,
        commentId: data.commentId,
        userId: data.userId,
        messageId: data.messageId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/reports] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// GET HANDLER - List reports (admin only)
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Get session/auth
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you must be logged in' },
        { status: 401 }
      );
    }

    // TODO: Add permission check to ensure user is admin/moderator
    // You may want to add logic like:
    // const user = await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   include: { memberships: true },
    // });
    // if (!user?.isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    // Fetch reports
    const reports = await prisma.report.findMany({
      where: {
        ...(status && { status: status as ReportStatus }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to 100 reports
    });

    return NextResponse.json(
      {
        success: true,
        data: reports,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/reports] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

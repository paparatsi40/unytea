"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateSessionRecap } from "./session-jobs";

export type AutopilotJobType =
  | "auto_promote"
  | "auto_engage"
  | "auto_capture"
  | "auto_distribute"
  | "auto_queue_next";

interface AutopilotJobPayload {
  autopilot: {
    kind: "job" | "run" | "metric";
    sessionId: string;
    runId?: string;
    trigger?: string;
    step?: string;
    status?: "queued" | "running" | "done" | "failed";
    jobType?: AutopilotJobType;
    runAt?: string;
    retries?: number;
    error?: string;
    detail?: Record<string, unknown>;
  };
}

function toPayload(payload: AutopilotJobPayload): any {
  return payload as any;
}

function createRunId(sessionId: string) {
  return `autopilot:${sessionId}:${Date.now()}`;
}

export async function startSessionAutopilot(sessionId: string, trigger: string = "session_created") {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      communityId: true,
      mentorId: true,
      seriesId: true,
      timezone: true,
      duration: true,
    },
  });

  if (!session?.communityId) {
    return { success: false, error: "Session without community" };
  }

  const runId = createRunId(sessionId);

  await prisma.sessionEvent.create({
    data: {
      sessionId,
      communityId: session.communityId,
      type: "SESSION_CREATED",
      payload: toPayload({
        autopilot: {
          kind: "run",
          sessionId,
          runId,
          trigger,
          step: "scheduled",
          status: "done",
          detail: {
            title: session.title,
            scheduledAt: session.scheduledAt.toISOString(),
          },
        },
      }),
    },
  });

  const now = Date.now();
  const scheduledMs = new Date(session.scheduledAt).getTime();
  const runAtEngage = new Date(Math.max(now + 60 * 1000, scheduledMs - 18 * 60 * 60 * 1000));

  const jobs: Array<{ jobType: AutopilotJobType; runAt: Date }> = [
    { jobType: "auto_promote", runAt: new Date(now + 5 * 1000) },
    { jobType: "auto_engage", runAt: runAtEngage },
    { jobType: "auto_capture", runAt: new Date(scheduledMs + Math.max(15, session.duration) * 60 * 1000) },
    { jobType: "auto_distribute", runAt: new Date(scheduledMs + Math.max(90, session.duration + 30) * 60 * 1000) },
    { jobType: "auto_queue_next", runAt: new Date(scheduledMs + 2 * 60 * 60 * 1000) },
  ];

  for (const job of jobs) {
    await enqueueAutopilotJob(sessionId, session.communityId, runId, job.jobType, job.runAt);
  }

  return { success: true, runId, jobsQueued: jobs.length };
}

export async function markAutopilotStep(
  sessionId: string,
  communityId: string | null | undefined,
  step: string,
  detail?: Record<string, unknown>
) {
  if (!communityId) return { success: false, error: "Missing community" };

  await prisma.sessionEvent.create({
    data: {
      sessionId,
      communityId,
      type: "SESSION_UPDATED",
      payload: toPayload({
        autopilot: {
          kind: "run",
          sessionId,
          step,
          status: "done",
          detail,
        },
      }),
    },
  });

  return { success: true };
}

async function enqueueAutopilotJob(
  sessionId: string,
  communityId: string,
  runId: string,
  jobType: AutopilotJobType,
  runAt: Date
) {
  await prisma.sessionEvent.create({
    data: {
      sessionId,
      communityId,
      type: "SESSION_UPDATED",
      payload: toPayload({
        autopilot: {
          kind: "job",
          sessionId,
          runId,
          status: "queued",
          jobType,
          runAt: runAt.toISOString(),
          retries: 0,
        },
      }),
    },
  });
}

export async function runAutopilotDueJobs(limit: number = 30) {
  const now = new Date();
  const events = await prisma.sessionEvent.findMany({
    where: {
      type: "SESSION_UPDATED",
      payload: {
        path: ["autopilot", "kind"],
        equals: "job",
      },
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  const due = events
    .map((e) => ({ event: e, payload: (e.payload as any)?.autopilot as any }))
    .filter((x) => x.payload?.status === "queued")
    .filter((x) => x.payload?.runAt && new Date(x.payload.runAt).getTime() <= now.getTime())
    .slice(0, limit);

  const results = {
    scanned: events.length,
    due: due.length,
    executed: 0,
    failed: 0,
  };

  for (const item of due) {
    const payload = item.payload;
    try {
      await prisma.sessionEvent.update({
        where: { id: item.event.id },
        data: {
          payload: toPayload({
            autopilot: {
              ...payload,
              status: "running",
            },
          }),
        },
      });

      await executeAutopilotJob(payload.sessionId, payload.jobType as AutopilotJobType);

      await prisma.sessionEvent.update({
        where: { id: item.event.id },
        data: {
          payload: toPayload({
            autopilot: {
              ...payload,
              status: "done",
              finishedAt: new Date().toISOString(),
            },
          }),
        },
      });

      results.executed += 1;
    } catch (error) {
      await prisma.sessionEvent.update({
        where: { id: item.event.id },
        data: {
          payload: toPayload({
            autopilot: {
              ...payload,
              status: "failed",
              error: String(error),
              retries: (payload.retries || 0) + 1,
            },
          }),
        },
      });
      results.failed += 1;
    }
  }

  return { success: true, ...results };
}

async function executeAutopilotJob(sessionId: string, jobType: AutopilotJobType) {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: {
      mentor: { select: { id: true, name: true, image: true } },
      community: { select: { id: true, slug: true, name: true } },
      participations: { select: { userId: true, eventsData: true } },
      notes: true,
      recording: true,
      series: true,
    },
  });

  if (!session || !session.communityId) return;

  if (jobType === "auto_promote") {
    const existingQuestion = await prisma.post.findFirst({
      where: {
        communityId: session.communityId,
        contentType: "QUESTION",
        attachments: { path: ["sessionId"], equals: session.id },
      },
      select: { id: true },
    });

    if (!existingQuestion) {
      await prisma.post.create({
        data: {
          title: `💬 Drop your questions: ${session.title}`,
          content: `What do you want to learn in this live session? Leave your questions here before we go live.`,
          contentType: "QUESTION",
          authorId: session.mentorId,
          communityId: session.communityId,
          attachments: {
            sessionId: session.id,
            lifecycleStage: "autopilot_pre_questions",
            scheduledAt: session.scheduledAt.toISOString(),
          } as any,
        },
      });
    }

    await markAutopilotStep(session.id, session.communityId, "promoted", {
      jobType,
      questionPromptCreated: !existingQuestion,
    });

    revalidatePath(`/dashboard/c/${session.community?.slug}/feed`);
    revalidatePath(`/en/explore`);
    return;
  }

  if (jobType === "auto_engage") {
    const questionsCount = await prisma.comment.count({
      where: {
        post: {
          communityId: session.communityId,
          attachments: { path: ["sessionId"], equals: session.id },
        },
      },
    });

    if (questionsCount < 3) {
      await prisma.post.create({
        data: {
          title: `🧵 Starting soon: Ask your questions for ${session.title}`,
          content: `We start soon. Drop one question now so the session can answer what matters most.`,
          contentType: "QUESTION",
          authorId: session.mentorId,
          communityId: session.communityId,
          attachments: {
            sessionId: session.id,
            lifecycleStage: "autopilot_low_engagement_nudge",
            questionCountAtTrigger: questionsCount,
          } as any,
        },
      });
    }

    await markAutopilotStep(session.id, session.communityId, "engaged", {
      jobType,
      questionsCount,
    });

    revalidatePath(`/dashboard/c/${session.community?.slug}/feed`);
    return;
  }

  if (jobType === "auto_capture") {
    if (session.recording?.status === "READY" || session.recordingUrl) {
      await markAutopilotStep(session.id, session.communityId, "captured", {
        jobType,
        recordingReady: true,
      });
    }
    return;
  }

  if (jobType === "auto_distribute") {
    await generateSessionRecap(session.id);

    await prisma.post.create({
      data: {
        title: `📣 Share highlights: ${session.title}`,
        content: `Your recap is ready. Share one highlight and invite members to watch replay.`,
        contentType: "ANNOUNCEMENT",
        authorId: session.mentorId,
        communityId: session.communityId,
        attachments: {
          sessionId: session.id,
          lifecycleStage: "autopilot_distribution",
          replayLink: session.slug ? `/sessions/${session.slug}` : `/dashboard/sessions/${session.id}`,
        } as any,
      },
    });

    await markAutopilotStep(session.id, session.communityId, "distributed", {
      jobType,
    });

    revalidatePath(`/dashboard/recordings`);
    revalidatePath(`/dashboard/knowledge-library`);
    return;
  }

  if (jobType === "auto_queue_next") {
    const now = new Date();
    const hasUpcoming = await prisma.mentorSession.count({
      where: {
        communityId: session.communityId,
        mentorId: session.mentorId,
        status: "SCHEDULED",
        scheduledAt: { gte: now },
      },
    });

    if (hasUpcoming === 0) {
      const nextSlot = new Date(session.scheduledAt);
      nextSlot.setDate(nextSlot.getDate() + 7);

      await prisma.post.create({
        data: {
          title: "📅 Queue next session?",
          content: `No session is scheduled for next week. Use the same slot (${nextSlot.toLocaleString()}) to keep momentum.`,
          contentType: "ANNOUNCEMENT",
          authorId: session.mentorId,
          communityId: session.communityId,
          attachments: {
            sessionId: session.id,
            lifecycleStage: "autopilot_queue_next",
            suggestedAt: nextSlot.toISOString(),
            actionHref: "/dashboard/sessions/create?from=autopilot_same_slot",
          } as any,
        },
      });
    }

    await markAutopilotStep(session.id, session.communityId, "next_queued", {
      jobType,
      hasUpcoming,
    });

    revalidatePath(`/dashboard/sessions`);
  }
}

export async function getAutopilotOverview(limit: number = 20) {
  const events = await prisma.sessionEvent.findMany({
    where: {
      payload: {
        path: ["autopilot", "kind"],
        equals: "job",
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      session: {
        select: {
          id: true,
          title: true,
          community: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  const jobs = events
    .map((e) => {
      const ap = (e.payload as any)?.autopilot;
      if (!ap) return null;
      return {
        id: e.id,
        createdAt: e.createdAt,
        sessionId: ap.sessionId as string,
        runId: ap.runId as string | undefined,
        status: ap.status as string,
        jobType: ap.jobType as string,
        runAt: ap.runAt as string | undefined,
        retries: ap.retries as number | undefined,
        error: ap.error as string | undefined,
        sessionTitle: e.session?.title,
        communityName: e.session?.community?.name,
      };
    })
    .filter(Boolean) as Array<any>;

  const stats = {
    queued: jobs.filter((j) => j.status === "queued").length,
    running: jobs.filter((j) => j.status === "running").length,
    done: jobs.filter((j) => j.status === "done").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  const completionRate = stats.done + stats.failed > 0 ? Math.round((stats.done / (stats.done + stats.failed)) * 100) : 100;

  return {
    success: true,
    stats: {
      ...stats,
      completionRate,
      total: jobs.length,
    },
    jobs: jobs.slice(0, limit),
  };
}

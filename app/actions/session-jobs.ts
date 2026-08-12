"use server";

import { z } from "zod";
import { defineAction } from "@/lib/actions/define-action";
import { assertSessionHost } from "@/lib/actions/guards";
import { communityOfSession } from "@/lib/actions/resolvers";
import { endSessionJob, generateSessionRecap } from "@/lib/jobs/session-jobs";

/**
 * The browser-callable slice of the session job pipeline.
 *
 * The pipeline itself (auto-posting, reminder mail/push, recap generation, the
 * cron entry points) lives in lib/jobs/session-jobs.ts with no "use server"
 * directive, so it is reachable only through the CRON_SECRET-guarded routes.
 * Only the two operations a host performs from the UI are exposed here, and
 * both are gated on being that session's host or a community admin.
 */

const sessionIdSchema = z.string().min(1).max(64);

export const endSession = defineAction(
  {
    name: "endSession",
    auth: "member",
    args: [sessionIdSchema],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "create",
  },
  async (ctx, sessionId) => {
    await assertSessionHost(ctx, sessionId);
    return endSessionJob(sessionId);
  }
);

export const shareSessionRecap = defineAction(
  {
    name: "shareSessionRecap",
    auth: "member",
    args: [sessionIdSchema],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "create",
  },
  async (ctx, sessionId) => {
    await assertSessionHost(ctx, sessionId);
    return generateSessionRecap(sessionId);
  }
);

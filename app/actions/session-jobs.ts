"use server";

import { z } from "zod";
import { defineAction } from "@/lib/actions/define-action";
import { assertSessionHost } from "@/lib/actions/guards";
import { communityOfSession } from "@/lib/actions/resolvers";
import { endSessionJob } from "@/lib/jobs/session-jobs";
import {
  getSessionRecapDraft,
  publishSessionRecap,
  RECAP_MAX_LENGTH,
} from "@/lib/jobs/session-recap";

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

/**
 * The recap the host is about to review. Read-only — calling it publishes
 * nothing, which is the whole point of the split.
 */
export const getRecapDraft = defineAction(
  {
    name: "getRecapDraft",
    auth: "member",
    args: [sessionIdSchema],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "general",
  },
  async (ctx, sessionId) => {
    await assertSessionHost(ctx, sessionId);
    return getSessionRecapDraft(sessionId);
  }
);

/**
 * Publish the recap, with the text the host approved.
 *
 * `content` is required: there is no "share the default" call, because that is
 * exactly the blind publish this change removes. The client sends whatever is
 * in the preview box, edits included.
 */
export const shareSessionRecap = defineAction(
  {
    name: "shareSessionRecap",
    auth: "member",
    args: [sessionIdSchema, z.string().min(1).max(RECAP_MAX_LENGTH)],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "create",
  },
  async (ctx, sessionId, content) => {
    await assertSessionHost(ctx, sessionId);
    return publishSessionRecap(sessionId, content);
  }
);

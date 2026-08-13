import type { TodayDashboardData } from "@/app/actions/today-dashboard";

/**
 * Which single action the dashboard home should ask for.
 *
 * The home view previously offered seven equally-weighted calls to action at
 * once — "Create community" in the header, "Schedule session" in the hero, and
 * five quick actions — which is the same as offering none: a new owner with an
 * empty community has no way to tell which one moves them forward. This picks
 * one based on what is actually missing, and everything else is demoted to a
 * secondary row.
 *
 * The order is the order the work has to happen in. There is no point inviting
 * people into a community with nothing to read, and no point scheduling a
 * session for a room with nobody in it — so content comes before members, and
 * members before sessions.
 *
 * Kept out of the component so the rule can be tested on data alone.
 */

export type NextStepId =
  | "createCommunity"
  | "createPost"
  | "inviteMembers"
  | "scheduleSession"
  | "momentum";

export interface NextStep {
  id: NextStepId;
  href: string;
}

/**
 * Below this, a community still reads as empty to whoever lands in it, so
 * growing it is a more useful next step than programming it.
 */
export const FEW_MEMBERS_THRESHOLD = 5;

export function resolveNextStep(data: TodayDashboardData): NextStep {
  // Only an owner can act on any of these; a pure member has nothing to invite
  // people to, so their next step is to create something of their own.
  const owned = data.communities.find((c) => c.role === "owner");
  if (!owned) {
    return { id: "createCommunity", href: "/dashboard/communities/new" };
  }

  if (data.totalPosts === 0) {
    return { id: "createPost", href: `/dashboard/c/${owned.slug}/feed` };
  }

  if (owned.memberCount < FEW_MEMBERS_THRESHOLD) {
    return { id: "inviteMembers", href: `/dashboard/c/${owned.slug}/members` };
  }

  if (data.weeklyStats.sessionsThisWeek === 0) {
    return { id: "scheduleSession", href: "/dashboard/sessions/create" };
  }

  // Nothing is missing: keep the rhythm going rather than inventing a chore.
  return { id: "momentum", href: "/dashboard/sessions/create" };
}

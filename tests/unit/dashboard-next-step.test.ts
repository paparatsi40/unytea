import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resolveNextStep, FEW_MEMBERS_THRESHOLD } from "@/lib/dashboard/next-step";
import type { TodayDashboardData, TodayCommunity } from "@/app/actions/today-dashboard";

/**
 * UX Tier 1, item 4 — the dashboard home had no focus on a cold start.
 *
 * It offered seven equally-weighted calls to action at once: "Create community"
 * in the header, "Schedule session" in the hero, and five quick actions
 * including a "Create session" that pointed at the same page under a different
 * name and a "Settings" already permanently in the sidebar. A brand-new owner
 * with an empty community had no way to tell which one moved them forward.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function community(overrides: Partial<TodayCommunity> = {}): TodayCommunity {
  return {
    id: "c1",
    slug: "my-community",
    name: "My Community",
    imageUrl: null,
    memberCount: 50,
    role: "owner",
    ...overrides,
  };
}

function dashboard(overrides: Partial<TodayDashboardData> = {}): TodayDashboardData {
  return {
    user: { name: "Ada" },
    nextLiveSession: null,
    communities: [community()],
    totalPosts: 30,
    weeklyStats: {
      sessionsThisWeek: 3,
      newMembersThisWeek: 4,
      postsThisWeek: 6,
      sessionsDelta: 1,
      newMembersDelta: -1,
      postsDelta: 0,
    },
    recentActivity: [],
    ...overrides,
  };
}

describe("resolveNextStep", () => {
  it("asks a user with no community to create one", () => {
    expect(resolveNextStep(dashboard({ communities: [] }))).toEqual({
      id: "createCommunity",
      href: "/dashboard/communities/new",
    });
  });

  it("asks a member of someone else's community to create their own", () => {
    // A pure member has nothing to invite people to or post as the host.
    const step = resolveNextStep(
      dashboard({ communities: [community({ role: "member" })], totalPosts: 0 })
    );

    expect(step.id).toBe("createCommunity");
  });

  it("asks for the first post before asking for members", () => {
    // Inviting people into a community with nothing to read wastes the invite.
    const step = resolveNextStep(
      dashboard({ totalPosts: 0, communities: [community({ memberCount: 1 })] })
    );

    expect(step).toEqual({ id: "createPost", href: "/dashboard/c/my-community/feed" });
  });

  it("asks for members once there is something to read", () => {
    const step = resolveNextStep(
      dashboard({ totalPosts: 5, communities: [community({ memberCount: 2 })] })
    );

    expect(step).toEqual({ id: "inviteMembers", href: "/dashboard/c/my-community/members" });
  });

  it("stops asking for members at the threshold", () => {
    const atThreshold = resolveNextStep(
      dashboard({ communities: [community({ memberCount: FEW_MEMBERS_THRESHOLD })] })
    );
    const belowThreshold = resolveNextStep(
      dashboard({ communities: [community({ memberCount: FEW_MEMBERS_THRESHOLD - 1 })] })
    );

    expect(atThreshold.id).not.toBe("inviteMembers");
    expect(belowThreshold.id).toBe("inviteMembers");
  });

  it("asks for a session when the week is empty", () => {
    const step = resolveNextStep(
      dashboard({ weeklyStats: { ...dashboard().weeklyStats, sessionsThisWeek: 0 } })
    );

    expect(step).toEqual({ id: "scheduleSession", href: "/dashboard/sessions/create" });
  });

  it("does not invent a chore when nothing is missing", () => {
    expect(resolveNextStep(dashboard()).id).toBe("momentum");
  });

  it("points at a community the user owns, not one they merely joined", () => {
    const step = resolveNextStep(
      dashboard({
        totalPosts: 0,
        communities: [
          community({ id: "c2", slug: "someone-elses", role: "member" }),
          community({ id: "c1", slug: "mine", role: "owner" }),
        ],
      })
    );

    expect(step.href).toContain("/mine/");
  });

  it("always returns exactly one step", () => {
    // The point of the rule is that it cannot produce a tie.
    const cases = [
      dashboard({ communities: [] }),
      dashboard({ totalPosts: 0 }),
      dashboard({ communities: [community({ memberCount: 1 })] }),
      dashboard({ weeklyStats: { ...dashboard().weeklyStats, sessionsThisWeek: 0 } }),
      dashboard(),
    ];

    for (const data of cases) {
      const step = resolveNextStep(data);
      expect(typeof step.id).toBe("string");
      expect(step.href.startsWith("/dashboard/")).toBe(true);
    }
  });
});

/**
 * The view must present that one step as the only primary action, and stop
 * naming the same route twice.
 */
describe("the dashboard home surfaces one primary action", () => {
  const view = fs.readFileSync(
    path.join(REPO_ROOT, "components/dashboard/home/DashboardHomeView.tsx"),
    "utf8"
  );

  it("drives the hero from resolveNextStep", () => {
    expect(view).toContain("resolveNextStep(data)");
    expect(view).toContain("href={nextStep.href}");
  });

  it("no longer pins a second primary CTA in the header", () => {
    // The header's own "Create community" button competed with the hero.
    const header = view.slice(view.indexOf("<header"), view.indexOf("</header>"));
    expect(header).not.toContain("<Button");
  });

  it("does not repeat the primary action in the secondary row", () => {
    // Each secondary action is suppressed when it is the one the hero shows.
    for (const id of ["createCommunity", "createPost", "inviteMembers"]) {
      expect(view).toContain(`nextStep.id !== "${id}"`);
    }
    expect(view).toContain('nextStep.id !== "scheduleSession"');
  });
});

describe("one action, one label", () => {
  const view = fs.readFileSync(
    path.join(REPO_ROOT, "components/dashboard/home/DashboardHomeView.tsx"),
    "utf8"
  );

  it("names the session action once", () => {
    // "Schedule session" and "Create session" were two names for
    // /dashboard/sessions/create, side by side on the same page.
    expect(view).not.toContain("quickActions.createSession");
    expect(view).toContain("actionFirst.scheduleSession");
  });

  it.each(["en", "es", "fr"])("%s no longer defines the duplicate label", (locale) => {
    const messages = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
    );

    expect(messages.dashboard.home.quickActions.createSession).toBeUndefined();
    expect(messages.dashboard.home.actionFirst.scheduleSession).toBeTruthy();
  });

  it("drops the Settings quick action that duplicated the sidebar", () => {
    expect(view).not.toContain("quickActions.openSettings");
    expect(view).not.toContain('href="/dashboard/settings"');
  });

  it.each(["en", "es", "fr"])("%s no longer defines the Settings quick action", (locale) => {
    const messages = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
    );

    expect(messages.dashboard.home.quickActions.openSettings).toBeUndefined();
  });

  it("keeps Settings reachable from the sidebar", () => {
    // Removing the duplicate must not remove the route from the product.
    const sidebar = fs.readFileSync(
      path.join(REPO_ROOT, "components/dashboard/sidebar.tsx"),
      "utf8"
    );
    expect(sidebar).toContain("/dashboard/settings");
  });
});

describe("a flat week reads as a result, not a missing value", () => {
  const view = fs.readFileSync(
    path.join(REPO_ROOT, "components/dashboard/home/DashboardHomeView.tsx"),
    "utf8"
  );

  it("says so in words instead of rendering '— 0 vs last week'", () => {
    expect(view).toContain("noChangeLabel");
    expect(view).toContain('trend === "flat" ?');
  });

  it.each(["en", "es", "fr"])("%s has the wording", (locale) => {
    const messages = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
    );
    expect(messages.dashboard.home.analytics.noChange).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    subscriptions: { retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args) },
  },
}));

const mockHeadersGet = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: (k: string) => mockHeadersGet(k) }),
}));

const mockGetPlanFromPriceId = vi.fn();
vi.mock("@/lib/plans", () => ({
  getPlanFromPriceId: (...args: unknown[]) => mockGetPlanFromPriceId(...args),
}));

// Override the shared setup mock — webhook handler touches several models
// (processedStripeEvent, enrollment, subscriptionPlan, etc.) the shared
// stub in tests/setup.ts does not declare.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    processedStripeEvent: { create: vi.fn() },
    coursePurchase: { updateMany: vi.fn() },
    enrollment: { upsert: vi.fn() },
    course: { update: vi.fn() },
    member: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    community: { update: vi.fn() },
    subscription: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    subscriptionPlan: { findFirst: vi.fn() },
    user: { update: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

// `request.text()` is what the route reads. The actual payload string is
// passed straight into constructEvent (which is mocked), so the content
// doesn't matter — only that .text() returns a string.
function makeRequest(body = "raw-stripe-payload") {
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
  });
}

function loadPOST(): Promise<(req: Request) => Promise<Response>> {
  return import("@/app/api/stripe/webhook/route").then((m) => m.POST);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHeadersGet.mockReturnValue("t=1,v1=sig");
  // Default: ProcessedStripeEvent insert succeeds (not a duplicate).
  vi.mocked(prisma.processedStripeEvent.create).mockResolvedValue({} as never);
  // Default: getPlanFromPriceId returns null so platform-plan shortcut
  // doesn't trigger unless the test explicitly enables it.
  mockGetPlanFromPriceId.mockReturnValue(null);
});

describe("Stripe webhook — signature verification & idempotency", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    mockHeadersGet.mockReturnValue(null);
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing stripe-signature/);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when stripe-signature is invalid (constructEvent throws)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Webhook Error: Invalid signature/);
    expect(prisma.processedStripeEvent.create).not.toHaveBeenCalled();
  });

  it("inserts a ProcessedStripeEvent row on first delivery", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_first",
      type: "ping.unhandled",
      data: { object: {} },
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.processedStripeEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_first", type: "ping.unhandled" },
    });
  });

  it("returns 200 { duplicate: true } when ProcessedStripeEvent.create throws P2002", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: { object: { metadata: { userId: "u1" } } },
    });
    vi.mocked(prisma.processedStripeEvent.create).mockRejectedValue({ code: "P2002" });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, duplicate: true });
    // Critically: no downstream Prisma calls happened for this duplicate.
    expect(prisma.coursePurchase.updateMany).not.toHaveBeenCalled();
    expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it("returns 500 when ProcessedStripeEvent.create throws non-P2002 DB error", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_dberr",
      type: "checkout.session.completed",
      data: { object: { metadata: { userId: "u1" } } },
    });
    vi.mocked(prisma.processedStripeEvent.create).mockRejectedValue({
      code: "P1001",
      message: "Connection error",
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to record event/);
  });

  it("Stripe retry safety: same event.id processed twice never double-processes", async () => {
    const event = {
      id: "evt_retry",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          metadata: { userId: "u1", type: "course_purchase", courseId: "course_1" },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    // First delivery succeeds.
    vi.mocked(prisma.coursePurchase.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.enrollment.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.course.update).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res1 = await POST(makeRequest());
    expect(res1.status).toBe(200);
    expect(prisma.enrollment.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.course.update).toHaveBeenCalledTimes(1);

    // Second delivery (retry): processedStripeEvent.create now hits P2002.
    vi.mocked(prisma.processedStripeEvent.create).mockRejectedValueOnce({ code: "P2002" });

    const res2 = await POST(makeRequest());
    expect(res2.status).toBe(200);
    expect((await res2.json()).duplicate).toBe(true);
    // No additional downstream calls on the retry.
    expect(prisma.enrollment.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.course.update).toHaveBeenCalledTimes(1);
  });
});

describe("Stripe webhook — checkout.session.completed", () => {
  it("course_purchase: updates CoursePurchase, upserts Enrollment, increments Course.enrollmentCount", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_cp_ok",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_abc",
          customer: "cus_abc",
          metadata: { userId: "u1", type: "course_purchase", courseId: "course_1" },
        },
      },
    });
    vi.mocked(prisma.coursePurchase.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.enrollment.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.course.update).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(prisma.coursePurchase.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", courseId: "course_1", stripeSessionId: "cs_abc" },
      data: { status: "completed" },
    });
    expect(prisma.enrollment.upsert).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: "u1", courseId: "course_1" } },
      update: {},
      create: expect.objectContaining({
        userId: "u1",
        courseId: "course_1",
        progress: 0,
      }),
    });
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course_1" },
      data: { enrollmentCount: { increment: 1 } },
    });
  });

  it("missing userId in session.metadata: logs error and returns 200 (no throw)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockConstructEvent.mockReturnValue({
      id: "evt_no_user",
      type: "checkout.session.completed",
      data: { object: { id: "cs_x", customer: "cus_x", metadata: { type: "course_purchase" } } },
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/No userId/));
    expect(prisma.coursePurchase.updateMany).not.toHaveBeenCalled();
    expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("type=course_purchase but no courseId: skips silently (no enrollment created)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_no_course",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_no_course",
          customer: "cus_y",
          metadata: { userId: "u1", type: "course_purchase" },
        },
      },
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.coursePurchase.updateMany).not.toHaveBeenCalled();
    expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it("type unset (platform path): logs but does nothing destructive", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_platform_path",
      type: "checkout.session.completed",
      data: { object: { id: "cs_p", customer: "cus_p", metadata: { userId: "u1" } } },
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.coursePurchase.updateMany).not.toHaveBeenCalled();
    expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    expect(prisma.course.update).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — invoice.payment_succeeded (community_membership)", () => {
  function communitySubFixture() {
    return {
      id: "sub_comm",
      items: { data: [{ price: { id: "price_comm" } }] },
      metadata: { type: "community_membership", communityId: "comm_1", userId: "u_member" },
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_592_000,
      cancel_at_period_end: false,
    };
  }

  it("creates new Member (ACTIVE, MEMBER) and increments Community.memberCount when no existing membership", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_comm_new",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_comm", customer: "cus_c" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(communitySubFixture());
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.member.create).mockResolvedValue({} as never);
    vi.mocked(prisma.community.update).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_comm");
    expect(prisma.member.findFirst).toHaveBeenCalledWith({
      where: { userId: "u_member", communityId: "comm_1" },
    });
    expect(prisma.member.create).toHaveBeenCalledWith({
      data: { userId: "u_member", communityId: "comm_1", role: "MEMBER", status: "ACTIVE" },
    });
    expect(prisma.community.update).toHaveBeenCalledWith({
      where: { id: "comm_1" },
      data: { memberCount: { increment: 1 } },
    });
    expect(prisma.member.update).not.toHaveBeenCalled();
  });

  it("updates existing Member to ACTIVE and does NOT increment memberCount", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_comm_existing",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_comm", customer: "cus_c" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(communitySubFixture());
    vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: "mem_existing" } as never);
    vi.mocked(prisma.member.update).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: "mem_existing" },
      data: { status: "ACTIVE" },
    });
    expect(prisma.member.create).not.toHaveBeenCalled();
    expect(prisma.community.update).not.toHaveBeenCalled();
  });

  it("missing communityId: falls through (no member side effects)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_comm_no_cid",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_comm", customer: "cus_c" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      ...communitySubFixture(),
      metadata: { type: "community_membership", userId: "u_member" },
    });
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it("missing userId: falls through (no member side effects)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_comm_no_uid",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_comm", customer: "cus_c" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      ...communitySubFixture(),
      metadata: { type: "community_membership", communityId: "comm_1" },
    });
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
    expect(prisma.member.create).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — invoice.payment_succeeded (platform subscription)", () => {
  function platformSubFixture() {
    return {
      id: "sub_plat",
      items: { data: [{ price: { id: "price_pro" } }] },
      metadata: {},
      current_period_start: 1_700_000_000, // 2023-11-14T22:13:20.000Z
      current_period_end: 1_702_592_000, // 2023-12-14T22:13:20.000Z
      cancel_at_period_end: false,
    };
  }

  it("upserts Subscription with correct period dates (unix seconds → Date), status ACTIVE", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_plat_ok",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_plat", customer: "cus_plat" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(platformSubFixture());
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub_row_1",
      userId: "u_plat",
    } as never);
    vi.mocked(prisma.subscriptionPlan.findFirst).mockResolvedValue({
      id: "plan_pro",
      stripePriceId: "price_pro",
    } as never);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(prisma.subscriptionPlan.findFirst).toHaveBeenCalledWith({
      where: { stripePriceId: "price_pro" },
    });

    const upsertCall = vi.mocked(prisma.subscription.upsert).mock.calls[0]?.[0];
    expect(upsertCall).toBeDefined();
    expect(upsertCall!.where).toEqual({ stripeSubscriptionId: "sub_plat" });
    expect(upsertCall!.create).toMatchObject({
      userId: "u_plat",
      planId: "plan_pro",
      stripeSubscriptionId: "sub_plat",
      stripeCustomerId: "cus_plat",
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
    });
    expect((upsertCall!.create as { currentPeriodStart: Date }).currentPeriodStart.getTime()).toBe(
      1_700_000_000 * 1000
    );
    expect((upsertCall!.create as { currentPeriodEnd: Date }).currentPeriodEnd.getTime()).toBe(
      1_702_592_000 * 1000
    );
    expect(upsertCall!.update).toMatchObject({ status: "ACTIVE", cancelAtPeriodEnd: false });
  });

  it("errors gracefully when no existing Subscription for the customer (logs, no upsert)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockConstructEvent.mockReturnValue({
      id: "evt_plat_no_sub",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_plat", customer: "cus_orphan" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(platformSubFixture());
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/No existing subscription found/));
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.subscriptionPlan.findFirst).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("errors gracefully when no SubscriptionPlan matches priceId (logs, no upsert)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockConstructEvent.mockReturnValue({
      id: "evt_plat_no_plan",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_plat", customer: "cus_plat" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(platformSubFixture());
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub_row_1",
      userId: "u_plat",
    } as never);
    vi.mocked(prisma.subscriptionPlan.findFirst).mockResolvedValue(null);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/No subscription plan found/));
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  /**
   * Platform-plan paths mutate User.platformPlan only — they do NOT
   * refresh Subscription period fields. See task #58 for the
   * design discussion on whether that's intentional or a bug.
   */
  it("platform plan shortcut (userId in metadata): updates User.platformPlan and short-circuits the upsert path", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_plat_short_uid",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_plat", customer: "cus_plat" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      ...platformSubFixture(),
      metadata: { userId: "u_creator" },
    });
    mockGetPlanFromPriceId.mockReturnValue("CREATOR");
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u_creator" },
      data: { platformPlan: "CREATOR" },
    });
    // break short-circuits — these legacy paths must NOT run.
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    expect(prisma.subscriptionPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it("platform plan shortcut (no userId, fallback lookup): resolves via stripeCustomerId then updates platformPlan", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_plat_short_fallback",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_plat", customer: "cus_plat" } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      ...platformSubFixture(),
      metadata: {},
    });
    mockGetPlanFromPriceId.mockReturnValue("BUSINESS");
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({ userId: "u_resolved" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_plat" },
      orderBy: { createdAt: "desc" },
      select: { userId: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u_resolved" },
      data: { platformPlan: "BUSINESS" },
    });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.subscriptionPlan.findFirst).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — invoice.payment_failed", () => {
  it("sets matching Subscription status to PAST_DUE when subscriptionId present", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_fail_ok",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_fail" } },
    });
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_fail" },
      data: { status: "PAST_DUE" },
    });
  });

  it("does nothing when subscriptionId is missing (one-off invoice)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_fail_oneoff",
      type: "invoice.payment_failed",
      data: { object: { subscription: null } },
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — customer.subscription.updated", () => {
  it("uppercases status, converts dates, records canceledAt when present, preserves cancel_at_period_end", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_sub_upd_cancel",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_x",
          status: "active",
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
          cancel_at_period_end: true,
          canceled_at: 1_701_000_000,
        },
      },
    });
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const call = vi.mocked(prisma.subscription.updateMany).mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call!.where).toEqual({ stripeSubscriptionId: "sub_x" });
    const data = call!.data as {
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      canceledAt: Date | null;
    };
    expect(data.status).toBe("ACTIVE");
    expect(data.currentPeriodStart.getTime()).toBe(1_700_000_000 * 1000);
    expect(data.currentPeriodEnd.getTime()).toBe(1_702_592_000 * 1000);
    expect(data.cancelAtPeriodEnd).toBe(true);
    expect(data.canceledAt).toBeInstanceOf(Date);
    expect(data.canceledAt!.getTime()).toBe(1_701_000_000 * 1000);
  });

  it("records canceledAt as null when not present", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_sub_upd_no_cancel",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_y",
          status: "trialing",
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
          cancel_at_period_end: false,
          canceled_at: null,
        },
      },
    });
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const data = vi.mocked(prisma.subscription.updateMany).mock.calls[0]?.[0]?.data as {
      status: string;
      cancelAtPeriodEnd: boolean;
      canceledAt: Date | null;
    };
    expect(data.status).toBe("TRIALING");
    expect(data.cancelAtPeriodEnd).toBe(false);
    expect(data.canceledAt).toBeNull();
  });
});

describe("Stripe webhook — customer.subscription.deleted", () => {
  it("forces status=CANCELED and cancelAtPeriodEnd=true", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_sub_deleted",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_dead", items: { data: [] } } },
    });
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_dead" },
      data: { status: "CANCELED", cancelAtPeriodEnd: true },
    });
  });

  it("platform plan shortcut: additively resets User.platformPlan to START (updateMany still runs)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_sub_deleted_plat",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_dead_plat",
          items: { data: [{ price: { id: "price_business" } }] },
        },
      },
    });
    mockGetPlanFromPriceId.mockReturnValue("BUSINESS");
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({ userId: "u_canceled" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // Unconditional path still runs — the shortcut is additive, not alternative.
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_dead_plat" },
      data: { status: "CANCELED", cancelAtPeriodEnd: true },
    });
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_dead_plat" },
      select: { userId: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u_canceled" },
      data: { platformPlan: "START" },
    });
  });

  it("non-platform plan (community sub): updateMany runs but shortcut is gated off (no user touch)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_sub_deleted_comm",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_dead_comm",
          items: { data: [{ price: { id: "price_community" } }] },
        },
      },
    });
    mockGetPlanFromPriceId.mockReturnValue(null);
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(prisma.subscription.updateMany).toHaveBeenCalled();
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — unhandled event types", () => {
  it("returns 200 and logs the type (Stripe won't retry)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockConstructEvent.mockReturnValue({
      id: "evt_unknown",
      type: "customer.discount.created",
      data: { object: {} },
    });
    const POST = await loadPOST();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Unhandled event type/));
    logSpy.mockRestore();
  });
});

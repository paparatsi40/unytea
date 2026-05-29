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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    processedStripeEvent: { create: vi.fn() },
    coursePurchase: { updateMany: vi.fn() },
    enrollment: { upsert: vi.fn() },
    course: { update: vi.fn() },
    member: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    community: { update: vi.fn(), updateMany: vi.fn() },
    subscription: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    subscriptionPlan: { findFirst: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

function makeRequest(body = "raw-stripe-payload") {
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
  });
}

function loadPOST(): Promise<(req: Request) => Promise<Response>> {
  return import("@/app/api/stripe/webhook/route").then((m) => m.POST);
}

function makeSubscriptionUpdatedEvent(overrides: {
  status: string;
  metadata?: Record<string, string>;
}) {
  return {
    id: "evt_paywall_test",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_test",
        customer: "cus_test",
        status: overrides.status,
        current_period_start: 1_716_000_000,
        current_period_end: 1_718_000_000,
        cancel_at_period_end: false,
        canceled_at: null,
        metadata: overrides.metadata ?? {},
        items: { data: [{ price: { id: "price_creator_monthly" } }] },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHeadersGet.mockReturnValue("t=1,v1=sig");
  vi.mocked(prisma.processedStripeEvent.create).mockResolvedValue({} as never);
  mockGetPlanFromPriceId.mockReturnValue(null);
  // setCommunitiesPaywallLocked reads result.count; default { count: 0 }.
  vi.mocked(prisma.community.updateMany).mockResolvedValue({ count: 0 } as never);
  // updateMany on subscription returns a count too.
  vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);
});

describe("webhook paywall state machine — customer.subscription.updated", () => {
  it("locks communities when subscription status becomes PAUSED", async () => {
    mockConstructEvent.mockReturnValue(
      makeSubscriptionUpdatedEvent({ status: "paused" })
    );
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      userId: "host-1",
    } as never);

    const POST = await loadPOST();
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(prisma.community.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "host-1" },
      data: expect.objectContaining({
        paywallLocked: true,
        paywallLockedAt: expect.any(Date),
      }),
    });
  });

  it("unlocks communities when subscription returns to ACTIVE", async () => {
    mockConstructEvent.mockReturnValue(
      makeSubscriptionUpdatedEvent({ status: "active" })
    );
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      userId: "host-1",
    } as never);

    const POST = await loadPOST();
    await POST(makeRequest());

    expect(prisma.community.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "host-1" },
      data: {
        paywallLocked: false,
        paywallLockedAt: null,
      },
    });
  });

  it("locks communities on PAST_DUE", async () => {
    mockConstructEvent.mockReturnValue(
      makeSubscriptionUpdatedEvent({ status: "past_due" })
    );
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      userId: "host-1",
    } as never);

    const POST = await loadPOST();
    await POST(makeRequest());

    expect(prisma.community.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "host-1" },
      data: expect.objectContaining({ paywallLocked: true }),
    });
  });

  it("ignores community-membership subscriptions (communityId in metadata)", async () => {
    mockConstructEvent.mockReturnValue(
      makeSubscriptionUpdatedEvent({
        status: "paused",
        metadata: { communityId: "comm-xyz" },
      })
    );
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      userId: "member-1",
    } as never);

    const POST = await loadPOST();
    await POST(makeRequest());

    // Subscription record gets updated (status changed) but paywall is NOT
    // toggled — community-membership subs do not control host's paywall state.
    expect(prisma.community.updateMany).not.toHaveBeenCalled();
  });
});

describe("webhook paywall state machine — invoice events", () => {
  it("unlocks communities on invoice.payment_succeeded for platform plan", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_unlock",
      type: "invoice.payment_succeeded",
      data: {
        object: { subscription: "sub_test", customer: "cus_test" },
      },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: "price_creator_monthly" } }] },
      metadata: { userId: "host-1" },
      current_period_start: 1_716_000_000,
      current_period_end: 1_718_000_000,
      cancel_at_period_end: false,
    });
    // Enable the platform-plan shortcut path.
    mockGetPlanFromPriceId.mockReturnValue("CREATOR");

    const POST = await loadPOST();
    await POST(makeRequest());

    expect(prisma.community.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "host-1" },
      data: { paywallLocked: false, paywallLockedAt: null },
    });
  });

  it("locks communities on invoice.payment_failed", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_lock_fail",
      type: "invoice.payment_failed",
      data: {
        object: { subscription: "sub_test" },
      },
    });
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      userId: "host-1",
    } as never);

    const POST = await loadPOST();
    await POST(makeRequest());

    expect(prisma.community.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "host-1" },
      data: expect.objectContaining({ paywallLocked: true }),
    });
  });
});

describe("webhook paywall state machine — customer.subscription.deleted", () => {
  it("locks communities on subscription deletion for platform plan", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_delete",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test",
          items: { data: [{ price: { id: "price_creator_monthly" } }] },
        },
      },
    });
    mockGetPlanFromPriceId.mockReturnValue("CREATOR");
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      userId: "host-1",
    } as never);

    const POST = await loadPOST();
    await POST(makeRequest());

    expect(prisma.community.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "host-1" },
      data: expect.objectContaining({ paywallLocked: true }),
    });
  });
});

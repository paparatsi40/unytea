import { beforeEach, describe, expect, it, vi } from "vitest";

// Override the shared setup mock — subscription-state queries Subscription
// + Community models. Auth is mocked via @/lib/auth-utils equivalent here.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findFirst: vi.fn() },
    community: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentSubscriptionState, isCommunityPaywallLocked } from "@/lib/subscription-state";

const NOW = new Date("2026-05-29T12:00:00Z");

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

function makeSession() {
  return { user: { id: "user-1" } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

describe("getCurrentSubscriptionState", () => {
  it("returns null when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toBeNull();
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
  });

  it("returns no_subscription when user has no subs", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

    const result = await getCurrentSubscriptionState();

    expect(result).toEqual({ status: "no_subscription" });
  });

  it("returns trialing with daysRemaining=7 when trial ends in 7 days", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    const trialEnd = daysFromNow(7);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "TRIALING",
      currentPeriodEnd: trialEnd,
      plan: { name: "Creator" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toEqual({
      status: "trialing",
      trialEndsAt: trialEnd,
      daysRemaining: 7,
      planName: "Creator",
    });
  });

  it("returns trialing with daysRemaining=0 when trial ends today", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    // 30 minutes in the future — still same calendar day, but Math.ceil rounds up
    // to 1 day. Use exactly NOW to verify the 0 boundary instead.
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "TRIALING",
      currentPeriodEnd: NOW,
      plan: { name: "Creator" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toMatchObject({ status: "trialing", daysRemaining: 0 });
  });

  it("clamps daysRemaining to 0 when trial already ended (negative window)", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "TRIALING",
      currentPeriodEnd: daysFromNow(-2), // ended 2 days ago
      plan: { name: "Creator" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toMatchObject({ status: "trialing", daysRemaining: 0 });
  });

  it("returns active for ACTIVE status", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "ACTIVE",
      currentPeriodEnd: daysFromNow(30),
      plan: { name: "Business" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toEqual({ status: "active", planName: "Business" });
  });

  it("returns paywall_locked reason=paused for PAUSED status", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "PAUSED",
      currentPeriodEnd: daysFromNow(0),
      plan: { name: "Creator" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toEqual({ status: "paywall_locked", reason: "paused" });
  });

  it("returns paywall_locked reason=past_due for PAST_DUE", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "PAST_DUE",
      currentPeriodEnd: daysFromNow(0),
      plan: { name: "Creator" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toEqual({ status: "paywall_locked", reason: "past_due" });
  });

  it("returns paywall_locked reason=past_due for UNPAID (alias)", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "UNPAID",
      currentPeriodEnd: daysFromNow(0),
      plan: { name: "Creator" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toEqual({ status: "paywall_locked", reason: "past_due" });
  });

  it("returns paywall_locked reason=canceled for CANCELED", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      status: "CANCELED",
      currentPeriodEnd: daysFromNow(0),
      plan: { name: "Creator" },
    } as never);

    const result = await getCurrentSubscriptionState();

    expect(result).toEqual({ status: "paywall_locked", reason: "canceled" });
  });

  it("queries the most recent subscription (orderBy createdAt desc)", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

    await getCurrentSubscriptionState();

    const call = vi.mocked(prisma.subscription.findFirst).mock.calls[0]?.[0];
    expect(call?.orderBy).toEqual({ createdAt: "desc" });
    expect(call?.where).toEqual({ userId: "user-1" });
  });
});

describe("isCommunityPaywallLocked", () => {
  it("returns true when community.paywallLocked is true", async () => {
    vi.mocked(prisma.community.findUnique).mockResolvedValue({
      paywallLocked: true,
    } as never);

    const result = await isCommunityPaywallLocked("comm-1");

    expect(result).toBe(true);
  });

  it("returns false when community.paywallLocked is false", async () => {
    vi.mocked(prisma.community.findUnique).mockResolvedValue({
      paywallLocked: false,
    } as never);

    const result = await isCommunityPaywallLocked("comm-1");

    expect(result).toBe(false);
  });

  it("returns false when community not found", async () => {
    vi.mocked(prisma.community.findUnique).mockResolvedValue(null);

    const result = await isCommunityPaywallLocked("comm-missing");

    expect(result).toBe(false);
  });
});

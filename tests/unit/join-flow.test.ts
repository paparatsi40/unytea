import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";

/**
 * The /c/[slug]/join page joined the visitor as a side effect of RENDERING.
 *
 * On a plain GET it ran `prisma.member.create()` and a `memberCount` increment.
 * Next prefetches links on hover and a prefetch is a GET, so pointing at the
 * link was enough to join — the Sentry event that surfaced this carried `_rsc=`
 * in the query string. And because `findUnique`-then-`create` is a check rather
 * than a lock, two concurrent GETs both passed the check, the loser hit the
 * (userId, communityId) unique index, and the throw inside the render took the
 * whole page down with React #441.
 *
 * These tests hold two lines: the render writes nothing, and `joinCommunity`
 * survives being called twice.
 */

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async () => Object.assign((key: string) => key, { rich: (k: string) => k }),
}));

const redirectCalls: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectCalls.push(url);
    // Next's redirect() throws to unwind the render; mirror that so code after
    // a redirect does not run in the test either.
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import JoinPage from "@/app/[locale]/c/[slug]/join/page";
import { joinCommunity } from "@/app/actions/communities";

const COMMUNITY = {
  id: "community-1",
  slug: "unytea-2912",
  name: "Unytea",
  description: "A community",
  coverImageUrl: null,
  imageUrl: null,
  isPaid: false,
  requireApproval: false,
  memberCount: 12,
  ownerId: "owner-1",
};

/** Every Prisma method that mutates. None may run during a render. */
const WRITE_METHODS = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
] as const;

function writeCalls(): string[] {
  const models = ["member", "community", "user", "post", "subscription"] as const;
  const calls: string[] = [];

  for (const model of models) {
    for (const method of WRITE_METHODS) {
      const fn = (
        prisma as unknown as Record<string, Record<string, { mock?: { calls: unknown[] } }>>
      )[model]?.[method];
      const count = fn?.mock?.calls.length ?? 0;
      if (count > 0) calls.push(`prisma.${model}.${method} ×${count}`);
    }
  }

  const tx = (prisma as unknown as { $transaction: { mock: { calls: unknown[] } } }).$transaction;
  if (tx.mock.calls.length > 0) calls.push(`prisma.$transaction ×${tx.mock.calls.length}`);

  return calls;
}

async function render(overrides: Partial<typeof COMMUNITY> = {}, plan?: string) {
  vi.mocked(prisma.community.findUnique).mockResolvedValue({ ...COMMUNITY, ...overrides } as never);

  return JoinPage({
    params: Promise.resolve({ locale: "en", slug: "unytea-2912" }),
    searchParams: Promise.resolve(plan ? { plan } : {}),
  }) as Promise<ReactElement>;
}

/** Collect every `href` in a rendered element tree, including async children. */
async function hrefs(node: unknown, found: string[] = []): Promise<string[]> {
  if (node === null || node === undefined || typeof node !== "object") return found;

  if (Array.isArray(node)) {
    for (const child of node) await hrefs(child, found);
    return found;
  }

  const element = node as { type?: unknown; props?: Record<string, unknown> };
  const props = element.props;
  if (!props) return found;

  if (typeof props.href === "string") found.push(props.href);

  // Server components in the tree are functions returning a promise; unwrap
  // them so the CTA inside JoinShell is reachable.
  if (typeof element.type === "function") {
    try {
      const rendered = await (element.type as (p: unknown) => unknown)(props);
      await hrefs(rendered, found);
    } catch {
      // A client component (or one needing browser context) — its own props
      // were already scanned above.
    }
  }

  if (props.children) await hrefs(props.children, found);
  return found;
}

beforeEach(() => {
  vi.clearAllMocks();
  redirectCalls.length = 0;
  vi.mocked(prisma.community.findUnique).mockResolvedValue(COMMUNITY as never);
  vi.mocked(prisma.member.findUnique).mockResolvedValue(null as never);
  vi.mocked(auth).mockResolvedValue(null as never);
});

describe("rendering the join page performs no database writes", () => {
  it("writes nothing for an anonymous visitor", async () => {
    await render();

    expect(writeCalls()).toEqual([]);
  });

  it("writes nothing for a signed-in non-member — the case that used to join them", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);

    await render();

    // This is the exact path the old page used to run member.create on.
    expect(writeCalls()).toEqual([]);
  });

  it("writes nothing for a member already in the community", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({ status: "ACTIVE" } as never);

    await expect(render()).rejects.toThrow(/NEXT_REDIRECT/);

    expect(writeCalls()).toEqual([]);
    expect(redirectCalls).toEqual(["/dashboard/c/unytea-2912"]);
  });

  it("writes nothing for the owner", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: COMMUNITY.ownerId } } as never);

    await expect(render()).rejects.toThrow(/NEXT_REDIRECT/);

    expect(writeCalls()).toEqual([]);
    expect(redirectCalls).toEqual(["/dashboard/c/unytea-2912"]);
    // The owner is never even looked up as a member — nothing to join.
    expect(prisma.member.findUnique).not.toHaveBeenCalled();
  });

  it("writes nothing for a paid community", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);

    await render({ isPaid: true });

    expect(writeCalls()).toEqual([]);
  });

  it("writes nothing for a pending member", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({ status: "PENDING" } as never);

    await render();

    expect(writeCalls()).toEqual([]);
    expect(redirectCalls).toEqual([]);
  });

  it("the write detector is not vacuous", async () => {
    // Prove the assertions above could fail: a write here must be seen.
    await prisma.member.create({ data: {} } as never);
    expect(writeCalls()).toEqual(["prisma.member.create ×1"]);
  });
});

describe("the anonymous visitor gets a sign-in CTA, not a crash", () => {
  it("renders and offers sign-in with a return URL back to the join page", async () => {
    const tree = await render();
    const links = await hrefs(tree);

    const signIn = links.find((href) => href.startsWith("/auth/signin"));
    expect(signIn).toBeDefined();
    expect(decodeURIComponent(signIn!)).toContain("/en/c/unytea-2912/join");
  });

  it("carries the selected plan through sign-in", async () => {
    const tree = await render({}, "vip");
    const links = await hrefs(tree);

    const signIn = links.find((href) => href.startsWith("/auth/signin"));
    expect(decodeURIComponent(signIn!)).toContain("plan=vip");
  });

  it("does not redirect the anonymous visitor away", async () => {
    // The old page bounced straight to sign-in, so the visitor never saw what
    // they were being asked to sign in for.
    await render();
    expect(redirectCalls).toEqual([]);
  });
});

describe("a paid community routes to checkout, never to a membership write", () => {
  it("links to the checkout starter that sets the webhook's metadata", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);

    const tree = await render({ isPaid: true });
    const links = await hrefs(tree);

    const checkout = links.find((href) => href.includes("community-checkout-start"));
    expect(checkout).toBeDefined();
    expect(checkout).toContain("communityId=community-1");
    expect(checkout).toContain("slug=unytea-2912");
    // Membership for a paid community is created by the Stripe webhook on
    // `type: "community_membership"`, never by this page.
    expect(writeCalls()).toEqual([]);
  });

  it("passes the requested tier through", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);

    const tree = await render({ isPaid: true }, "vip");
    const links = await hrefs(tree);

    expect(links.find((h) => h.includes("community-checkout-start"))).toContain("tier=vip");
  });
});

describe("joinCommunity is idempotent", () => {
  const OWNER = { platformPlan: "PRO" };
  const FREE_COMMUNITY = {
    id: "community-1",
    slug: "unytea-2912",
    isPaid: false,
    requireApproval: false,
    memberCount: 12,
    ownerId: "owner-1",
  };

  function uniqueViolation() {
    return Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["userId", "communityId"] },
    });
  }

  beforeEach(() => {
    // joinCommunity runs through the defineAction seam, which resolves identity
    // with auth(); an unauthenticated call never reaches the handler at all.
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);
    vi.mocked(prisma.community.findUnique).mockResolvedValue(FREE_COMMUNITY as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(OWNER as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.member.create).mockResolvedValue({
      id: "member-1",
      status: "ACTIVE",
    } as never);
  });

  it("joins on the first call", async () => {
    const result = await joinCommunity("community-1");

    expect(result).toMatchObject({ success: true });
    expect(prisma.member.create).toHaveBeenCalledTimes(1);
  });

  it("does not throw on the second call, and creates nothing", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({ id: "member-1" } as never);

    const result = await joinCommunity("community-1");

    expect(result).toMatchObject({ success: false, code: "ALREADY_MEMBER" });
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it("absorbs the P2002 race instead of throwing it into the caller", async () => {
    // Both callers pass the findUnique check; the loser hits the unique index.
    // This is the exact error that crashed the page render.
    vi.mocked(prisma.member.create).mockRejectedValue(uniqueViolation());

    const result = await joinCommunity("community-1");

    expect(result).toMatchObject({ success: false, code: "ALREADY_MEMBER" });
  });

  it("does not inflate memberCount on the race path", async () => {
    vi.mocked(prisma.member.create).mockRejectedValue(uniqueViolation());

    await joinCommunity("community-1");

    // The transaction that won already incremented it.
    expect(prisma.community.update).not.toHaveBeenCalled();
  });

  it("moves the counter in the same transaction as the create", async () => {
    await joinCommunity("community-1");

    // Two sequential writes could leave a member the counter never saw.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.community.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { memberCount: { increment: 1 } } })
    );
  });

  it("does not count a PENDING member", async () => {
    vi.mocked(prisma.community.findUnique).mockResolvedValue({
      ...FREE_COMMUNITY,
      requireApproval: true,
    } as never);
    vi.mocked(prisma.member.create).mockResolvedValue({
      id: "member-1",
      status: "PENDING",
    } as never);

    const result = await joinCommunity("community-1");

    expect(result).toMatchObject({ success: true });
    expect(prisma.community.update).not.toHaveBeenCalled();
  });

  it("still surfaces a non-P2002 failure rather than reporting a phantom join", async () => {
    vi.mocked(prisma.member.create).mockRejectedValue(new Error("connection lost"));

    const result = await joinCommunity("community-1");

    expect(result).toMatchObject({ success: false });
    expect(result).not.toMatchObject({ code: "ALREADY_MEMBER" });
  });
});

describe("joinCommunity refuses a paid community", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "visitor-1" } } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.community.findUnique).mockResolvedValue({
      id: "community-1",
      slug: "paid-one",
      isPaid: true,
      requireApproval: false,
      memberCount: 3,
      ownerId: "owner-1",
    } as never);
  });

  it("returns PAYMENT_REQUIRED", async () => {
    const result = await joinCommunity("community-1");

    expect(result).toMatchObject({ success: false, code: "PAYMENT_REQUIRED" });
  });

  it("creates no membership", async () => {
    await joinCommunity("community-1");

    // The bypass this whole change exists to prevent.
    expect(prisma.member.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.community.update).not.toHaveBeenCalled();
  });
});

/**
 * A behavioural test only covers the paths it exercises. This one reads the
 * source: a page or layout is rendered on GET, so a mutating Prisma call
 * anywhere in one is the same class of bug regardless of which branch reaches
 * it.
 */
describe("no page or layout in the community tree writes during render", () => {
  const ROOT = path.resolve(__dirname, "../..");

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p, out);
      else if (/^(page|layout)\.tsx$/.test(entry.name)) out.push(p);
    }
    return out;
  }

  /**
   * Executable code only. The comment on the join page quotes the very call it
   * exists to warn about, and a scanner that cannot tell a warning from the
   * thing it warns against would force the explanation to be deleted.
   */
  function code(file: string): string {
    return fs
      .readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  }

  /** Server files only — a "use client" file does not render on the server. */
  const serverRendered = [
    ...walk(path.join(ROOT, "app/[locale]/c")),
    ...walk(path.join(ROOT, "app/(public)")),
  ].filter((file) => !fs.readFileSync(file, "utf8").includes('"use client"'));

  it("finds the files it claims to scan", () => {
    expect(serverRendered.length).toBeGreaterThan(0);
  });

  it.each(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"])(
    "none calls prisma.*.%s()",
    (method) => {
      const offenders = serverRendered
        .filter((file) => new RegExp(`prisma\\.[a-zA-Z]+\\.${method}\\(`).test(code(file)))
        .map((file) => path.relative(ROOT, file).split(path.sep).join("/"));

      expect(offenders).toEqual([]);
    }
  );

  it("none opens a transaction", () => {
    const offenders = serverRendered
      .filter((file) => code(file).includes("prisma.$transaction"))
      .map((file) => path.relative(ROOT, file).split(path.sep).join("/"));

    expect(offenders).toEqual([]);
  });

  it("the scanner still sees a real write", () => {
    // Guards the comment-stripping above from hiding actual code.
    const stripped = code(path.join(ROOT, "app/actions/communities.ts"));
    expect(/prisma\.[a-zA-Z]+\.create\(|tx\.[a-zA-Z]+\.create\(/.test(stripped)).toBe(true);
  });
});

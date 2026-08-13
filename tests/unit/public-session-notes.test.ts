import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * H2 — private session notes leaked from `getPublicSession`.
 *
 * `recording.url` was correctly gated on `canWatchRecording`, but `notes` was
 * returned unconditionally. On a `visibility: "community"` session a non-member
 * got a null video alongside the full written notes — content, summary, key
 * insights, chapters and quotes — which is the substantive paywalled material.
 *
 * The alias `getPublicSessionBySlug` spreads the same object, so it re-leaked
 * it; both are asserted here.
 */

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: new Proxy(
    {},
    { get: () => ({ check: async () => ({ success: true, remaining: 99, resetTime: 0 }) }) }
  ),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicSession, getPublicSessionBySlug } from "@/app/actions/public-sessions";

const MEMBER = "user_member";
const OUTSIDER = "user_outsider";

function sessionRow(visibility: "community" | "public" | "unlisted") {
  return {
    id: "session_1",
    slug: "weekly-office-hours",
    title: "Weekly office hours",
    description: "desc",
    status: "COMPLETED",
    visibility,
    scheduledAt: new Date("2026-01-01T10:00:00Z"),
    duration: 60,
    _count: { participations: 12 },
    mentor: { id: "host_1", name: "Host", image: null },
    community: {
      id: "community_1",
      name: "Paid Community",
      slug: "paid-community",
      description: null,
      imageUrl: null,
      _count: { members: 40 },
    },
    recording: {
      id: "rec_1",
      url: "https://cdn.example/recording.mp4",
      durationSeconds: 3600,
      status: "READY",
    },
    notes: {
      id: "note_1",
      content: "SECRET_NOTES_BODY",
      summary: "SECRET_SUMMARY",
      keyInsights: JSON.stringify(["SECRET_INSIGHT"]),
      resources: JSON.stringify([{ type: "chapter", title: "SECRET_CHAPTER" }]),
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
  };
}

/** Everything that must never reach a caller who cannot watch the recording. */
const SECRETS = ["SECRET_NOTES_BODY", "SECRET_SUMMARY", "SECRET_INSIGHT", "SECRET_CHAPTER"];

function asMember(isMember: boolean) {
  vi.mocked(prisma.member.findUnique).mockResolvedValue(
    isMember ? ({ status: "ACTIVE" } as never) : null
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(sessionRow("community") as never);
  vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(sessionRow("community") as never);
  asMember(false);
});

type Ok = { success: true; session: { notes: unknown; recording: { url: string | null } | null } };

describe("getPublicSession — notes follow the recording gate (H2)", () => {
  describe("community-visibility session", () => {
    it("withholds notes and recording url from an anonymous caller", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = (await getPublicSession("weekly-office-hours")) as Ok;

      expect(result.success).toBe(true);
      expect(result.session.notes).toBeNull();
      expect(result.session.recording?.url).toBeNull();
    });

    it("withholds notes from an authenticated non-member", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: OUTSIDER, role: "USER" } } as never);
      asMember(false);

      const result = (await getPublicSession("weekly-office-hours")) as Ok;

      expect(result.session.notes).toBeNull();
      expect(result.session.recording?.url).toBeNull();
    });

    it("leaks no note text anywhere in the payload for a non-member", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: OUTSIDER, role: "USER" } } as never);
      asMember(false);

      const serialised = JSON.stringify(await getPublicSession("weekly-office-hours"));

      for (const secret of SECRETS) {
        expect(serialised, `${secret} reached a non-member`).not.toContain(secret);
      }
    });

    it("gives an ACTIVE member both the notes and the recording url", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: MEMBER, role: "USER" } } as never);
      asMember(true);

      const result = (await getPublicSession("weekly-office-hours")) as Ok;

      expect(result.session.notes).not.toBeNull();
      expect(result.session.recording?.url).toBe("https://cdn.example/recording.mp4");
      expect(JSON.stringify(result)).toContain("SECRET_NOTES_BODY");
    });

    it("treats a PENDING membership as a non-member", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: MEMBER, role: "USER" } } as never);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({ status: "PENDING" } as never);

      const result = (await getPublicSession("weekly-office-hours")) as Ok;

      expect(result.session.notes).toBeNull();
    });
  });

  describe("public-visibility session", () => {
    beforeEach(() => {
      vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(sessionRow("public") as never);
      vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(sessionRow("public") as never);
    });

    it("still serves notes and recording to an anonymous caller", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = (await getPublicSession("weekly-office-hours")) as Ok;

      // The host published this one; withholding it would be a regression the
      // other way.
      expect(result.session.notes).not.toBeNull();
      expect(result.session.recording?.url).toBe("https://cdn.example/recording.mp4");
    });
  });
});

describe("getPublicSessionBySlug — the alias inherits the gate (H2)", () => {
  it("withholds notes from a non-member", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: OUTSIDER, role: "USER" } } as never);
    asMember(false);

    const legacy = (await getPublicSessionBySlug("weekly-office-hours")) as {
      notes: unknown;
      recording: { url: string | null } | null;
    } | null;

    expect(legacy).not.toBeNull();
    expect(legacy!.notes).toBeNull();
    expect(legacy!.recording?.url).toBeNull();
    expect(JSON.stringify(legacy)).not.toContain("SECRET_NOTES_BODY");
  });

  it("serves notes to an ACTIVE member", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: MEMBER, role: "USER" } } as never);
    asMember(true);

    const legacy = (await getPublicSessionBySlug("weekly-office-hours")) as { notes: unknown };

    expect(legacy.notes).not.toBeNull();
  });
});

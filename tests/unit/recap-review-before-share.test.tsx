// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { prisma } from "@/lib/prisma";
import { buildSessionRecapContent, publishSessionRecap } from "@/lib/jobs/session-recap";
import { endSessionJob } from "@/lib/jobs/session-jobs";
import { RecapReviewPanel } from "@/components/sessions/RecapReviewPanel";

/**
 * The recap used to publish itself.
 *
 * `generateSessionRecap` built the text and created the community feed post in
 * one call, and three triggers fired it: `endSessionJob`, the recording-ready
 * webhook, and the autopilot distribute job. A host who ended a session found
 * their recap already on the feed; the post-session card's only state was
 * "Already shared". Nobody had read it.
 *
 * Drafting and publishing are now separate. These tests pin the boundary from
 * both directions: no automatic path may create a post, and the only thing that
 * does is a host pressing share — with whatever text is in the box.
 *
 * `tests/setup.ts` mocks `@/lib/prisma`, so `prisma.post.create` is a spy: "was
 * a post created" is asserted directly rather than inferred.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const SESSION = {
  id: "sess-1",
  title: "Deep work, weekly",
  description: "A working session",
  mode: "VIDEO",
  duration: 60,
  scheduledAt: new Date("2026-03-04T10:00:00Z"),
  mentorId: "host-1",
  communityId: "comm-1",
  recordingUrl: null,
  attendeeCount: 4,
  feedPostId: null,
  community: { slug: "focus" },
  notes: {
    content: "line one\nline two",
    summary: "We covered focus rituals.",
    keyInsights: JSON.stringify(["Block the calendar", "Kill notifications"]),
    resources: null,
  },
};

const postCreate = vi.mocked(prisma.post.create);
const sessionUpdate = vi.mocked(prisma.mentorSession.update);
const sessionFindUnique = vi.mocked(prisma.mentorSession.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
  sessionFindUnique.mockResolvedValue(SESSION as never);
  sessionUpdate.mockResolvedValue({ ...SESSION, status: "COMPLETED" } as never);
  postCreate.mockResolvedValue({ id: "post-1" } as never);
});

afterEach(() => {
  cleanup();
});

// ───────────────────────────────────────────────────────────────────────────
describe("ending a session", () => {
  it("does not post the recap to the feed", async () => {
    const result = await endSessionJob("sess-1");

    expect(result.success).toBe(true);
    // The assertion that matters: no feed post was created by ending.
    expect(postCreate).not.toHaveBeenCalled();
  });

  it("still marks the session completed", async () => {
    await endSessionJob("sess-1");

    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sess-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
  });

  it("does not link a feedPostId", async () => {
    await endSessionJob("sess-1");

    const linkedRecap = sessionUpdate.mock.calls.some((call) => {
      const data = (call[0] as { data?: Record<string, unknown> })?.data ?? {};
      return "feedPostId" in data;
    });
    expect(linkedRecap).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("no automatic publisher remains", () => {
  // Structural: the three job modules must not reach the publish function.
  // Comments are stripped first — they describe the removed behaviour and
  // quote the old names. Same helper as tests/unit/livekit-room-options.test.ts.
  function code(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  }

  const JOB_MODULES = [
    "lib/jobs/session-jobs.ts",
    "lib/jobs/livekit-webhook.ts",
    "lib/jobs/autopilot.ts",
  ];

  it.each(JOB_MODULES)("%s never calls publishSessionRecap", (relativePath) => {
    const source = code(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));

    expect(source).not.toContain("publishSessionRecap");
    // The old entry point is gone entirely rather than left as a no-op.
    expect(source).not.toContain("generateSessionRecap");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("drafting", () => {
  it("builds a recap without writing anything", () => {
    const content = buildSessionRecapContent(SESSION);

    expect(content).toContain("Deep work, weekly");
    expect(content).toContain("We covered focus rituals.");
    expect(content).toContain("Block the calendar");
    expect(postCreate).not.toHaveBeenCalled();
    expect(sessionUpdate).not.toHaveBeenCalled();
  });

  it("is pure — the same session yields the same draft", () => {
    expect(buildSessionRecapContent(SESSION)).toBe(buildSessionRecapContent(SESSION));
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("publishing", () => {
  it("creates the post with the content it was given", async () => {
    const result = await publishSessionRecap("sess-1", "Host's own words about the session");

    expect(result.success).toBe(true);
    expect(postCreate).toHaveBeenCalledTimes(1);
    expect(postCreate.mock.calls[0][0]).toMatchObject({
      data: expect.objectContaining({
        content: "Host's own words about the session",
        communityId: "comm-1",
      }),
    });
  });

  it("does not re-derive the draft, so edits survive", async () => {
    const draft = buildSessionRecapContent(SESSION);
    await publishSessionRecap("sess-1", "Completely different text");

    const posted = (postCreate.mock.calls[0][0] as { data: { content: string } }).data.content;
    expect(posted).toBe("Completely different text");
    expect(posted).not.toBe(draft);
  });

  it("links the post to the session", async () => {
    await publishSessionRecap("sess-1", "Recap body");

    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { id: "sess-1" },
      data: { feedPostId: "post-1" },
    });
  });

  it("refuses an empty recap", async () => {
    const result = await publishSessionRecap("sess-1", "   ");

    expect(result.success).toBe(false);
    expect(postCreate).not.toHaveBeenCalled();
  });

  it("refuses to publish twice", async () => {
    sessionFindUnique.mockResolvedValue({ ...SESSION, feedPostId: "post-existing" } as never);

    const result = await publishSessionRecap("sess-1", "Recap body");

    expect(result.success).toBe(false);
    expect(postCreate).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the review panel", () => {
  const DRAFT = "Generated recap draft";

  function renderPanel(overrides: Partial<Parameters<typeof RecapReviewPanel>[0]> = {}) {
    const onLoadDraft = vi.fn(async () => DRAFT);
    const onShare = vi.fn(async () => true);
    const onDismiss = vi.fn();

    render(
      <NextIntlClientProvider locale="en" messages={MESSAGES}>
        <RecapReviewPanel
          onLoadDraft={onLoadDraft}
          onShare={onShare}
          onDismiss={onDismiss}
          alreadyShared={false}
          {...overrides}
        />
      </NextIntlClientProvider>
    );

    return { onLoadDraft, onShare, onDismiss };
  }

  async function editor(): Promise<HTMLTextAreaElement> {
    return (await screen.findByLabelText("Recap content")) as HTMLTextAreaElement;
  }

  it("shows the generated recap as an editable preview", async () => {
    const { onLoadDraft, onShare } = renderPanel();

    const box = await editor();
    expect(box.value).toBe(DRAFT);
    expect(onLoadDraft).toHaveBeenCalledTimes(1);
    // Loading a draft must never publish.
    expect(onShare).not.toHaveBeenCalled();
  });

  it("starts in the draft state, not shared", async () => {
    renderPanel();
    await editor();

    expect(screen.getByText("Draft — not shared")).toBeTruthy();
    expect(screen.queryByText("Shared to feed")).toBeNull();
  });

  it("publishes nothing until share is pressed", async () => {
    const { onShare } = renderPanel();
    await editor();

    expect(onShare).not.toHaveBeenCalled();
  });

  it("shares the draft when share is pressed", async () => {
    const { onShare } = renderPanel();
    await editor();

    fireEvent.click(screen.getByRole("button", { name: /Share to feed/i }));

    await waitFor(() => expect(onShare).toHaveBeenCalledWith(DRAFT));
  });

  it("shares the edited text, not the generated one", async () => {
    const { onShare } = renderPanel();
    const box = await editor();

    fireEvent.change(box, { target: { value: "Host rewrote this entirely" } });
    fireEvent.click(screen.getByRole("button", { name: /Share to feed/i }));

    await waitFor(() => expect(onShare).toHaveBeenCalledWith("Host rewrote this entirely"));
    expect(onShare).not.toHaveBeenCalledWith(DRAFT);
  });

  it("marks the recap edited once the host changes it", async () => {
    renderPanel();
    const box = await editor();

    fireEvent.change(box, { target: { value: `${DRAFT} plus a note` } });

    expect(screen.getByText("Edited — not shared")).toBeTruthy();
  });

  it("reports shared only after a successful share", async () => {
    renderPanel();
    await editor();

    expect(screen.queryByText("Shared to feed")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Share to feed/i }));

    await waitFor(() => expect(screen.getByText("Shared to feed")).toBeTruthy());
  });

  it("discards without publishing", async () => {
    const { onShare, onDismiss } = renderPanel();
    await editor();

    fireEvent.click(screen.getByRole("button", { name: /^Discard$/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onShare).not.toHaveBeenCalled();
  });

  it("discards edits without publishing them either", async () => {
    const { onShare, onDismiss } = renderPanel();
    const box = await editor();

    fireEvent.change(box, { target: { value: "Something the host thought better of" } });
    fireEvent.click(screen.getByRole("button", { name: /^Discard$/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onShare).not.toHaveBeenCalled();
  });

  it("cannot share an emptied recap", async () => {
    const { onShare } = renderPanel();
    const box = await editor();

    fireEvent.change(box, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Share to feed/i }));

    expect(onShare).not.toHaveBeenCalled();
  });
});

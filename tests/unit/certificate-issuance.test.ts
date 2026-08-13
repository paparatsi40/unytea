import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Certificates are issued automatically on completion.
 *
 * Previously a client-callable `issueCertificate` action let the learner mint
 * their own. The authority was sound, but the trigger was wrong: the
 * certificate's existence depended on a UI call that nothing ever made.
 * Issuance is now a consequence of `markLessonComplete` pushing an enrollment to
 * 100%, and there is no client-callable path to mint one.
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
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markLessonComplete } from "@/app/actions/courses";
import { issueCertificateForEnrollment } from "@/lib/certificates";
import { makeMemberRow, makeCommunityRow } from "../helpers/authz";

const LEARNER = "user_learner";
const OTHER = "user_other";
const COMMUNITY = "community_1";
const COURSE = "course_1";
const LESSON = "lesson_final";
const ENROLLMENT = "enrollment_1";

function enrollmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ENROLLMENT,
    userId: LEARNER,
    courseId: COURSE,
    progress: 100,
    completedAt: new Date("2026-02-01T00:00:00Z"),
    course: {
      title: "Advanced Community Building",
      communityId: COMMUNITY,
      community: { name: "Paid Community" },
      modules: [
        {
          lessons: [
            { quizzes: [{ attempts: [{ score: 90 }] }] },
            { quizzes: [{ attempts: [{ score: 70 }] }] },
          ],
        },
      ],
    },
    ...overrides,
  };
}

/** Wires the mocks so markLessonComplete drives the enrollment to 100%. */
function completingFinalLesson({ totalLessons = 2, completedLessons = 2 } = {}) {
  vi.mocked(auth).mockResolvedValue({ user: { id: LEARNER, role: "USER" } } as never);
  vi.mocked(prisma.member.findUnique).mockResolvedValue(
    makeMemberRow({ userId: LEARNER, communityId: COMMUNITY })
  );
  vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());
  vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
    id: LESSON,
    module: { courseId: COURSE, course: { communityId: COMMUNITY } },
  } as never);
  vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({
    id: ENROLLMENT,
    userId: LEARNER,
    courseId: COURSE,
  } as never);
  vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({ id: "lp_1" } as never);
  vi.mocked(prisma.lesson.count).mockResolvedValue(totalLessons);
  vi.mocked(prisma.lessonProgress.count).mockResolvedValue(completedLessons);
  vi.mocked(prisma.enrollment.update).mockResolvedValue({ id: ENROLLMENT } as never);
  vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(enrollmentRow() as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Learner" } as never);
  vi.mocked(prisma.certificate.create).mockResolvedValue({
    id: "cert_1",
    certificateNumber: "UNY-TEST-0001",
    enrollmentId: ENROLLMENT,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("automatic issuance on completion", () => {
  it("issues exactly one certificate when the final lesson completes the course", async () => {
    completingFinalLesson();
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);

    const result = await markLessonComplete(LESSON);

    expect(result).toMatchObject({ success: true, courseCompleted: true });
    expect(prisma.certificate.create).toHaveBeenCalledTimes(1);
  });

  it("returns the certificate to the caller with no second request", async () => {
    completingFinalLesson();
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);

    const result = (await markLessonComplete(LESSON)) as { certificate: { id: string } | null };

    expect(result.certificate).not.toBeNull();
    expect(result.certificate?.id).toBe("cert_1");
  });

  it("does not issue while the course is still in progress", async () => {
    completingFinalLesson({ totalLessons: 4, completedLessons: 2 });
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);

    const result = await markLessonComplete(LESSON);

    expect(result).toMatchObject({ success: true, courseCompleted: false });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("creates no duplicate when the completion path runs again", async () => {
    completingFinalLesson();
    // Second run: the certificate already exists.
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      id: "cert_1",
      enrollmentId: ENROLLMENT,
    } as never);

    const result = await markLessonComplete(LESSON);

    expect(result).toMatchObject({ success: true });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("still records the lesson completion if issuance fails", async () => {
    completingFinalLesson();
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.certificate.create).mockRejectedValue(new Error("db down"));

    const result = await markLessonComplete(LESSON);

    // The learner earned the completion; a certificate problem must not undo it.
    expect(result).toMatchObject({ success: true });
    expect(prisma.enrollment.update).toHaveBeenCalledTimes(1);
  });

  it("requires no client action — issuance is not exported from the action layer", async () => {
    const actions = (await import("@/app/actions/certificates")) as Record<string, unknown>;

    // The self-serve mint is gone; only reads remain.
    expect(actions.issueCertificate).toBeUndefined();
    expect(Object.keys(actions).sort()).toEqual([
      "getCertificate",
      "getUserCertificates",
      "verifyCertificate",
    ]);
  });
});

describe("issueCertificateForEnrollment — the invariant holds", () => {
  beforeEach(() => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Learner" } as never);
    vi.mocked(prisma.certificate.create).mockResolvedValue({ id: "cert_1" } as never);
  });

  it("refuses an enrollment belonging to someone else", async () => {
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(enrollmentRow() as never);

    const result = await issueCertificateForEnrollment(ENROLLMENT, OTHER);

    expect(result).toMatchObject({ success: false, error: "Not your enrollment" });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("refuses an incomplete enrollment", async () => {
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(
      enrollmentRow({ progress: 60 }) as never
    );

    const result = await issueCertificateForEnrollment(ENROLLMENT, LEARNER);

    expect(result).toMatchObject({ success: false });
    expect((result as { error: string }).error).toMatch(/not yet completed/i);
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("refuses a missing enrollment", async () => {
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

    const result = await issueCertificateForEnrollment("nope", LEARNER);

    expect(result).toMatchObject({ success: false, error: "Enrollment not found" });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("is idempotent — an already-issued certificate is returned, not re-created", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      id: "cert_existing",
      enrollmentId: ENROLLMENT,
    } as never);

    const result = await issueCertificateForEnrollment(ENROLLMENT, LEARNER);

    expect(result).toMatchObject({ success: true, alreadyIssued: true });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("survives a concurrent issue that wins the unique-constraint race", async () => {
    const { Prisma } = await import("@prisma/client");
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(enrollmentRow() as never);
    // Nothing on the first read, then the other writer's row after P2002.
    vi.mocked(prisma.certificate.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "cert_from_race", enrollmentId: ENROLLMENT } as never);
    vi.mocked(prisma.certificate.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "5",
      })
    );

    const result = await issueCertificateForEnrollment(ENROLLMENT, LEARNER);

    expect(result).toMatchObject({ success: true, alreadyIssued: true });
    expect((result as { certificate: { id: string } }).certificate.id).toBe("cert_from_race");
  });

  it("averages only this learner's own passing attempts", async () => {
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(enrollmentRow() as never);

    await issueCertificateForEnrollment(ENROLLMENT, LEARNER);

    const createArg = vi.mocked(prisma.certificate.create).mock.calls[0][0] as {
      data: { score: number };
    };
    expect(createArg.data.score).toBe(80); // (90 + 70) / 2

    // The attempts relation must be filtered to this user, or another learner's
    // scores would inflate the certificate.
    const findArg = vi.mocked(prisma.enrollment.findUnique).mock.calls[0][0] as unknown;
    expect(JSON.stringify(findArg)).toContain(LEARNER);
    expect(JSON.stringify(findArg)).toContain('"passed":true');
  });
});

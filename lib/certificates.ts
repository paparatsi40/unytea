import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Certificate } from "@prisma/client";

/**
 * Certificate issuance — internal only, deliberately NOT a `"use server"` module.
 *
 * Issuance used to be a client-callable action (`issueCertificate`) that the
 * learner invoked to mint their own certificate. The authority was sound — it
 * checked `enrollment.userId === caller`, `progress === 100` and the caller's
 * own passed quiz attempts — but making the learner the trigger is the wrong
 * shape: it left the certificate's existence dependent on a UI call that, as it
 * happens, nothing ever made.
 *
 * Issuance is now a consequence of completion. `markLessonComplete` calls this
 * when an enrollment's progress reaches 100, so the certificate appears without
 * anyone asking for it, and there is no client-callable path to mint one.
 *
 * The invariant is unchanged and enforced here rather than at the seam: a
 * certificate is only ever created for an enrollment that belongs to the given
 * user and is genuinely complete.
 */

function generateCertificateNumber(): string {
  const prefix = "UNY";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export type IssueResult =
  | { success: true; certificate: Certificate; alreadyIssued: boolean }
  | { success: false; error: string };

/**
 * Issue the certificate for a completed enrollment.
 *
 * Idempotent in two layers: an early read returns any existing certificate, and
 * the create is guarded against the unique constraint on `enrollmentId` so two
 * concurrent completions cannot produce a duplicate or a spurious failure.
 *
 * @param enrollmentId the enrollment to certify
 * @param userId       the learner the enrollment must belong to
 */
export async function issueCertificateForEnrollment(
  enrollmentId: string,
  userId: string
): Promise<IssueResult> {
  const existing = await prisma.certificate.findUnique({ where: { enrollmentId } });
  if (existing) {
    return { success: true, certificate: existing, alreadyIssued: true };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: {
        include: {
          community: { select: { name: true } },
          modules: {
            include: {
              lessons: {
                include: {
                  quizzes: {
                    include: {
                      // Only this learner's own passing attempts feed the score.
                      attempts: {
                        where: { userId, passed: true },
                        orderBy: { score: "desc" },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    return { success: false, error: "Enrollment not found" };
  }
  // Retained even though the only caller already resolved the enrollment from
  // the session: this function is the last line of defence on the invariant.
  if (enrollment.userId !== userId) {
    return { success: false, error: "Not your enrollment" };
  }
  if (enrollment.progress < 100) {
    return {
      success: false,
      error: `Course not yet completed. Progress: ${Math.round(enrollment.progress)}%`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  let totalScore = 0;
  let quizCount = 0;
  for (const mod of enrollment.course.modules) {
    for (const lesson of mod.lessons) {
      for (const quiz of lesson.quizzes) {
        if (quiz.attempts.length > 0) {
          totalScore += quiz.attempts[0].score;
          quizCount++;
        }
      }
    }
  }
  const averageScore = quizCount > 0 ? totalScore / quizCount : null;

  try {
    const certificate = await prisma.certificate.create({
      data: {
        certificateNumber: generateCertificateNumber(),
        userId,
        enrollmentId,
        courseName: enrollment.course.title,
        userName: user?.name || "Student",
        communityName: enrollment.course.community?.name,
        completionDate: enrollment.completedAt || new Date(),
        score: averageScore,
        metadata: {
          courseId: enrollment.courseId,
          communityId: enrollment.course.communityId,
          totalModules: enrollment.course.modules.length,
          totalQuizzes: quizCount,
        },
      },
    });

    return { success: true, certificate, alreadyIssued: false };
  } catch (error) {
    // P2002 = unique constraint. Another concurrent completion won the race;
    // that is a success for our purposes, not an error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.certificate.findUnique({ where: { enrollmentId } });
      if (raced) {
        return { success: true, certificate: raced, alreadyIssued: true };
      }
    }
    throw error;
  }
}

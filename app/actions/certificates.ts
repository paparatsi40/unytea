"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";

// ── Generate Certificate Number ──────────────────────────────────────
function generateCertificateNumber(): string {
  const prefix = "UNY";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ── Issue Certificate ────────────────────────────────────────────────
export const issueCertificate = defineAction(
  {
    name: "issueCertificate",
    auth: "user",
    args: [z.string().min(1).max(64)],
    rateLimit: "create",
  },
  async (ctx, enrollmentId: string) => {
  try {
    const userId = ctx.userId;

    // Check if certificate already exists
    const existing = await prisma.certificate.findUnique({
      where: { enrollmentId },
    });
    if (existing) {
      return { success: true, certificate: existing, alreadyIssued: true };
    }

    // Get enrollment with course and user details
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

    if (!enrollment) return { success: false, error: "Enrollment not found" };
    if (enrollment.userId !== userId) return { success: false, error: "Not your enrollment" };

    // Fetch user name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Verify completion (progress === 100)
    if (enrollment.progress < 100) {
      return {
        success: false,
        error: `Course not yet completed. Progress: ${Math.round(enrollment.progress)}%`,
      };
    }

    // Calculate average quiz score across the course
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

    // Issue the certificate
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

    return { success: true, certificate };
  } catch (error) {
    console.error("[issueCertificate] Error:", error);
    return { success: false, error: "Failed to issue certificate" };
  }
}
);

// ── Get Certificate by ID ────────────────────────────────────────────
export const getCertificate = defineAction(
  {
    name: "getCertificate",
    auth: "user",
    args: [z.string().min(1).max(64)],
  },
  async (ctx, certificateId: string) => {
  try {
    // Scoped to the holder: this used to return any certificate row by id.
    const certificate = await prisma.certificate.findFirst({
      where: { id: certificateId, userId: ctx.userId },
    });

    if (!certificate) return { success: false, error: "Certificate not found" };

    return { success: true, certificate };
  } catch (error) {
    console.error("[getCertificate] Error:", error);
    return { success: false, error: "Failed to get certificate" };
  }
}
);

// ── Verify Certificate by Number (public) ────────────────────────────
export const verifyCertificate = defineAction(
  {
    name: "verifyCertificate",
    auth: "public",
    args: [z.string().min(1).max(128)],
    rateLimit: "api",
  },
  async (_ctx, certificateNumber: string) => {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
    });

    if (!certificate) {
      return { success: false, error: "Certificate not found", valid: false };
    }

    return {
      success: true,
      valid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        userName: certificate.userName,
        courseName: certificate.courseName,
        communityName: certificate.communityName,
        completionDate: certificate.completionDate,
        issuedAt: certificate.issuedAt,
      },
    };
  } catch (error) {
    console.error("[verifyCertificate] Error:", error);
    return { success: false, error: "Failed to verify certificate" };
  }
}
);

// ── Get User Certificates ────────────────────────────────────────────
export const getUserCertificates = defineAction(
  {
    name: "getUserCertificates",
    auth: "user",
    args: [],
  },
  async (ctx) => {
  try {
    const userId = ctx.userId;

    const certificates = await prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
    });

    return { success: true, certificates };
  } catch (error) {
    console.error("[getUserCertificates] Error:", error);
    return { success: false, error: "Failed to get certificates" };
  }
}
);

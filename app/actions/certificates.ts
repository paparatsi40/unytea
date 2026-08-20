"use server";

/**
 * Certificate reads.
 *
 * Issuance deliberately lives in lib/certificates.ts, not here: it is a
 * consequence of completing a course, triggered by markLessonComplete, and has
 * no client-callable entry point. The self-serve `issueCertificate` action that
 * used to sit in this file (and had zero callers) is gone, so no request can
 * mint a certificate.
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";

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

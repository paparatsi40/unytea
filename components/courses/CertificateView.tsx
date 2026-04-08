"use client";

import { Award, Download, ExternalLink, CheckCircle } from "lucide-react";

interface CertificateData {
  id: string;
  certificateNumber: string;
  userName: string;
  courseName: string;
  communityName?: string | null;
  completionDate: Date | string;
  score?: number | null;
  issuedAt: Date | string;
}

interface CertificateViewProps {
  certificate: CertificateData;
  showVerifyLink?: boolean;
}

export function CertificateView({
  certificate,
  showVerifyLink = true,
}: CertificateViewProps) {
  const completionDate = new Date(certificate.completionDate);
  const formattedDate = completionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/30">
      {/* Decorative corners */}
      <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-purple-500/40" />
      <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-purple-500/40" />
      <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-purple-500/40" />
      <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-purple-500/40" />

      <div className="px-8 py-10 text-center">
        {/* Logo / Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
            <Award className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-purple-400">
          Certificate of Completion
        </p>
        <h2 className="mb-6 text-3xl font-bold text-white">Unytea</h2>

        {/* Recipient */}
        <p className="mb-1 text-sm text-zinc-500">This certifies that</p>
        <p className="mb-4 text-2xl font-bold text-white">
          {certificate.userName}
        </p>

        {/* Course */}
        <p className="mb-1 text-sm text-zinc-500">
          has successfully completed
        </p>
        <p className="mb-2 text-xl font-semibold text-purple-300">
          {certificate.courseName}
        </p>

        {certificate.communityName && (
          <p className="mb-4 text-sm text-zinc-500">
            by {certificate.communityName}
          </p>
        )}

        {/* Score */}
        {certificate.score !== null && certificate.score !== undefined && (
          <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Score: {Math.round(certificate.score)}%
            </span>
          </div>
        )}

        {/* Date */}
        <p className="mb-6 text-sm text-zinc-500">{formattedDate}</p>

        {/* Divider */}
        <div className="mx-auto mb-4 h-px w-48 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        {/* Certificate Number */}
        <p className="mb-4 font-mono text-xs text-zinc-600">
          Certificate #{certificate.certificateNumber}
        </p>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {showVerifyLink && (
            <a
              href={`/certificates/verify?code=${certificate.certificateNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Verify
            </a>
          )}
          <button
            onClick={() => {
              // Copy shareable link
              navigator.clipboard.writeText(
                `${window.location.origin}/certificates/verify?code=${certificate.certificateNumber}`
              );
            }}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Share Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact Certificate Card (for lists) ─────────────────────────────
export function CertificateCard({
  certificate,
}: {
  certificate: CertificateData;
}) {
  const completionDate = new Date(certificate.completionDate);
  const formattedDate = completionDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
        <Award className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {certificate.courseName}
        </p>
        <p className="text-xs text-zinc-500">
          {formattedDate}
          {certificate.score !== null &&
            certificate.score !== undefined &&
            ` · Score: ${Math.round(certificate.score)}%`}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[10px] text-zinc-600">
        {certificate.certificateNumber}
      </span>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { Search, ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { verifyCertificate } from "@/app/actions/certificates";
import { CertificateView } from "@/components/courses/CertificateView";

function VerifyCertificateContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    certificate?: {
      certificateNumber: string;
      userName: string;
      courseName: string;
      communityName?: string | null;
      completionDate: Date;
      issuedAt: Date;
    };
  } | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyCertificate(code.trim());
      if (res.success && res.valid && res.certificate) {
        setResult({ valid: true, certificate: res.certificate as {
          certificateNumber: string;
          userName: string;
          courseName: string;
          communityName?: string | null;
          completionDate: Date;
          issuedAt: Date;
        } });
      } else {
        setResult({ valid: false });
      }
    } catch {
      setResult({ valid: false });
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if code came in URL
  useState(() => {
    if (initialCode) {
      handleVerify();
    }
  });

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Verify Certificate
          </h1>
          <p className="text-sm text-zinc-500">
            Enter a certificate number to verify its authenticity
          </p>
        </div>

        {/* Search box */}
        <div className="mb-8 flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="e.g., UNY-ABC123-XYZ1"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={handleVerify}
            disabled={loading || !code.trim()}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Verify
          </button>
        </div>

        {/* Result */}
        {result && (
          <>
            {result.valid && result.certificate ? (
              <div>
                <div className="mb-4 flex items-center justify-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Valid Certificate
                  </span>
                </div>
                <CertificateView
                  certificate={{
                    id: "",
                    ...result.certificate,
                    score: null,
                  }}
                  showVerifyLink={false}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
                <ShieldX className="mx-auto mb-3 h-10 w-10 text-red-400" />
                <h3 className="mb-1 text-lg font-bold text-white">
                  Certificate Not Found
                </h3>
                <p className="text-sm text-zinc-500">
                  The certificate number you entered could not be verified.
                  Please check the number and try again.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyCertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <VerifyCertificateContent />
    </Suspense>
  );
}

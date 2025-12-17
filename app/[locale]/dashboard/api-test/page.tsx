"use client";

import { useState } from "react";
import { Check, X, Loader2, Sparkles, Database } from "lucide-react";

export default function APITestPage() {
  const [openAITest, setOpenAITest] = useState<any>(null);
  const [r2Test, setR2Test] = useState<any>(null);
  const [loading, setLoading] = useState({ openai: false, r2: false });

  const testOpenAI = async () => {
    setLoading({ ...loading, openai: true });
    setOpenAITest(null);

    try {
      const response = await fetch("/api/test/openai");
      const data = await response.json();
      setOpenAITest(data);
    } catch (error: any) {
      setOpenAITest({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading({ ...loading, openai: false });
    }
  };

  const testR2 = async () => {
    setLoading({ ...loading, r2: true });
    setR2Test(null);

    try {
      const response = await fetch("/api/test/r2");
      const data = await response.json();
      setR2Test(data);
    } catch (error: any) {
      setR2Test({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading({ ...loading, r2: false });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          🔧 API Configuration Test
        </h1>
        <p className="text-white/60">
          Test your API connections before recording sessions
        </p>
      </div>

      {/* Test Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* OpenAI Test Card */}
        <div className="glass-strong border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">OpenAI API</h2>
              <p className="text-sm text-white/60">Whisper + GPT-4</p>
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={testOpenAI}
            disabled={loading.openai}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
          >
            {loading.openai ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </button>

          {/* Results */}
          {openAITest && (
            <div
              className={`p-4 rounded-xl ${
                openAITest.success
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {openAITest.success ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <X className="w-5 h-5 text-red-400" />
                )}
                <span
                  className={`font-semibold ${
                    openAITest.success ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {openAITest.success ? "Connected! ✅" : "Failed ❌"}
                </span>
              </div>

              {openAITest.success ? (
                <div className="space-y-2 text-sm text-white/80">
                  <p className="font-medium">{openAITest.message}</p>
                  {openAITest.tests && (
                    <div className="space-y-1 mt-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>API Key Configured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Models Accessible</span>
                      </div>
                      {openAITest.tests.whisperAvailable && (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Whisper Available</span>
                        </div>
                      )}
                      {openAITest.tests.gpt4Available && (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>GPT-4 Available</span>
                        </div>
                      )}
                    </div>
                  )}
                  {openAITest.estimatedCosts && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-xs text-white/60">
                        💰 Estimated costs:
                      </p>
                      <p className="text-xs text-white/80 mt-1">
                        {openAITest.estimatedCosts.example}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-red-400 font-medium">
                    {openAITest.error}
                  </p>
                  {openAITest.hint && (
                    <p className="text-white/60">{openAITest.hint}</p>
                  )}
                  <div className="mt-3 p-3 rounded-lg bg-black/20">
                    <p className="text-xs text-white/60">
                      📝 Check your .env.local file:
                    </p>
                    <code className="text-xs text-white/80 mt-1 block">
                      OPENAI_API_KEY=sk-proj-...
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* R2 Test Card */}
        <div className="glass-strong border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cloudflare R2</h2>
              <p className="text-sm text-white/60">Video Storage</p>
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={testR2}
            disabled={loading.r2}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
          >
            {loading.r2 ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </button>

          {/* Results */}
          {r2Test && (
            <div
              className={`p-4 rounded-xl ${
                r2Test.success
                  ? "bg-blue-500/10 border border-blue-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {r2Test.success ? (
                  <Check className="w-5 h-5 text-blue-400" />
                ) : (
                  <X className="w-5 h-5 text-red-400" />
                )}
                <span
                  className={`font-semibold ${
                    r2Test.success ? "text-blue-400" : "text-red-400"
                  }`}
                >
                  {r2Test.success ? "Connected! ✅" : "Failed ❌"}
                </span>
              </div>

              {r2Test.success ? (
                <div className="space-y-2 text-sm text-white/80">
                  <p className="font-medium">{r2Test.message}</p>
                  {r2Test.tests && (
                    <div className="space-y-1 mt-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-400" />
                        <span>Credentials Valid</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-400" />
                        <span>Connection Successful</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-400" />
                        <span>Upload Successful</span>
                      </div>
                    </div>
                  )}
                  {r2Test.config && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-xs text-white/60">Bucket:</p>
                      <p className="text-xs text-white/80 font-mono">
                        {r2Test.config.bucketName}
                      </p>
                    </div>
                  )}
                  {r2Test.estimatedCosts && (
                    <div className="mt-3">
                      <p className="text-xs text-white/60">
                        💰 Storage: {r2Test.estimatedCosts.storage}
                      </p>
                      <p className="text-xs text-emerald-400 font-medium">
                        ✨ {r2Test.estimatedCosts.egress}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-red-400 font-medium">{r2Test.error}</p>
                  {r2Test.hint && (
                    <p className="text-white/60">{r2Test.hint}</p>
                  )}
                  <div className="mt-3 p-3 rounded-lg bg-black/20">
                    <p className="text-xs text-white/60">
                      📝 Check your .env.local file:
                    </p>
                    <code className="text-xs text-white/80 mt-1 block">
                      R2_ACCOUNT_ID=...
                      <br />
                      R2_ACCESS_KEY_ID=...
                      <br />
                      R2_SECRET_ACCESS_KEY=...
                      <br />
                      R2_BUCKET_NAME=...
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide Link */}
      <div className="mt-8 p-6 glass-strong border border-white/10 rounded-2xl">
        <h3 className="text-lg font-bold text-white mb-2">
          📚 Need help setting up?
        </h3>
        <p className="text-white/60 mb-4">
          Follow our comprehensive API setup guide to configure OpenAI and
          Cloudflare R2.
        </p>
        <a
          href="/API_SETUP_GUIDE.md"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
        >
          View Setup Guide →
        </a>
      </div>
    </div>
  );
}

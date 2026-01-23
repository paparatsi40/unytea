"use client";

import { CSPInlineScript, CSPScript } from "@/components/csp-script";

export default function CSPTestClient({ nonce }: { nonce?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          🛡️ CSP Testing Page
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            ✅ Nonce Status
          </h2>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="text-gray-700">
              <strong>Current Nonce:</strong>{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {nonce || "NOT FOUND"}
              </code>
            </p>
            {nonce ? (
              <p className="text-green-600 mt-2">
                ✅ Nonce is being generated correctly
              </p>
            ) : (
              <p className="text-red-600 mt-2">
                ❌ Nonce not found - check middleware.ts
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            🧪 Script Tests
          </h2>

          <div className="space-y-4">
            {/* Test 1: CSPInlineScript */}
            <div className="border border-gray-200 rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-2">
                Test 1: CSPInlineScript
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                This should execute and show a green checkmark below:
              </p>
              <div id="test1-result" className="text-gray-400">
                ⏳ Waiting for script...
              </div>
              <CSPInlineScript>
                {`
                  setTimeout(() => {
                    const el = document.getElementById('test1-result');
                    if (el) {
                      el.innerHTML = '✅ CSPInlineScript works!';
                      el.className = 'text-green-600 font-semibold';
                    }
                  }, 500);
                `}
              </CSPInlineScript>
            </div>

            {/* Test 2: CSPScript */}
            <div className="border border-gray-200 rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-2">
                Test 2: CSPScript with strategy
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                This should execute after the page is interactive:
              </p>
              <div id="test2-result" className="text-gray-400">
                ⏳ Waiting for script...
              </div>
              <CSPScript strategy="afterInteractive">
                {`
                  setTimeout(() => {
                    const el = document.getElementById('test2-result');
                    if (el) {
                      el.innerHTML = '✅ CSPScript (afterInteractive) works!';
                      el.className = 'text-green-600 font-semibold';
                    }
                  }, 600);
                `}
              </CSPScript>
            </div>

            {/* Test 3: Regular script (should fail) */}
            <div className="border border-red-200 bg-red-50 rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-2">
                Test 3: Regular script without nonce (SHOULD FAIL)
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                This should be blocked by CSP and show an error in Console:
              </p>
              <div id="test3-result" className="text-gray-400">
                ❌ If this changes, CSP is NOT working
              </div>
              {/* This script should be blocked by CSP */}
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    document.getElementById('test3-result').innerHTML = '🔴 Regular script executed (CSP NOT working!)';
                    document.getElementById('test3-result').className = 'text-red-600 font-bold';
                  `,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            🔍 How to Verify
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>
              <strong>Check Console:</strong> Open DevTools Console (F12)
            </li>
            <li>
              <strong>Look for CSP errors:</strong> You should see{" "}
              <code className="bg-red-100 px-2 py-1 rounded text-sm">
                Refused to execute inline script
              </code>{" "}
              for Test 3
            </li>
            <li>
              <strong>Tests 1 & 2 should pass:</strong> Green checkmarks
            </li>
            <li>
              <strong>Test 3 should fail:</strong> Message should not change
            </li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            📋 Expected Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-green-200 bg-green-50 rounded p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                ✅ Success Indicators
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✅ Nonce is visible above</li>
                <li>✅ Test 1 shows green checkmark</li>
                <li>✅ Test 2 shows green checkmark</li>
                <li>✅ Test 3 stays gray (blocked)</li>
                <li>
                  ✅ Console shows CSP error for Test 3 (this is correct!)
                </li>
              </ul>
            </div>

            <div className="border border-red-200 bg-red-50 rounded p-4">
              <h3 className="font-semibold text-red-800 mb-2">
                ❌ Failure Indicators
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>❌ Nonce shows &quot;NOT FOUND&quot;</li>
                <li>❌ Test 1 or 2 stay gray</li>
                <li>❌ Test 3 turns red (CSP not enforced)</li>
                <li>❌ Console shows CSP errors for Tests 1 & 2</li>
                <li>❌ No CSP errors in Console at all</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-blue-800">
            💡 What to do if tests fail
          </h2>
          <div className="text-gray-700 space-y-2">
            <p>
              <strong>If Tests 1 & 2 fail:</strong> Check that{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                lib/csp.ts
              </code>{" "}
              and{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                middleware.ts
              </code>{" "}
              are correctly implemented.
            </p>
            <p>
              <strong>If Test 3 passes (it shouldn&apos;t):</strong> CSP is not
              being enforced. Check DevTools Network tab for{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                Content-Security-Policy
              </code>{" "}
              header.
            </p>
            <p>
              <strong>If Nonce is NOT FOUND:</strong> Check that{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                middleware.ts
              </code>{" "}
              sets the{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                x-nonce
              </code>{" "}
              header.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/en/dashboard"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

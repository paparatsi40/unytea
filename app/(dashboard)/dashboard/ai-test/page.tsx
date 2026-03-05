"use client";

import { AIChatWidget } from "@/components/ai/AIChatWidget";
import { useEffect } from "react";

export default function AITestPage() {
  useEffect(() => {
    console.log("✅ AI Test Page mounted");
    console.log("✅ AIChatWidget loading...");
  }, []);

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🤖 AI Assistant Test
        </h1>
        
        <div className="space-y-4 text-gray-600">
          <p>
            Welcome to the AI Assistant test page! The AI chatbot is now active.
          </p>

          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
            <h2 className="font-semibold text-sky-900 mb-2">✨ How to use:</h2>
            <ol className="list-decimal list-inside space-y-1 text-sky-800">
              <li>Look for the sparkle button (✨) in the bottom-right corner</li>
              <li>Click it to open the chat window</li>
              <li>Type any question and press Enter</li>
              <li>The AI will respond with context-aware answers</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h2 className="font-semibold text-purple-900 mb-2">💡 Try asking:</h2>
            <ul className="list-disc list-inside space-y-1 text-purple-800">
              <li>"What can you help me with?"</li>
              <li>"How do I create a new post?"</li>
              <li>"Tell me about the community features"</li>
              <li>"What are achievements?"</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="font-semibold text-green-900 mb-2">🎯 AI Features:</h2>
            <ul className="list-disc list-inside space-y-1 text-green-800">
              <li>24/7 availability</li>
              <li>Context-aware responses</li>
              <li>Conversation history</li>
              <li>Community-specific knowledge</li>
              <li>Helpful and friendly tone</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="font-semibold text-yellow-900 mb-2">⚡ Status:</h2>
            <div className="space-y-1 text-yellow-800">
              <p>✅ OpenAI Integration: Active</p>
              <p>✅ Chat Widget: Loaded</p>
              <p>✅ API Key: Configured</p>
              <p>✅ Ready to chat!</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
"use client";

import { motion } from "framer-motion";
import { Sparkles, Target, CheckCircle2, Tag, Copy, Check } from "lucide-react";
import { useState } from "react";

interface AISummaryCardProps {
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  topics?: string[];
  language?: string;
  wordCount?: number;
}

export function AISummaryCard({
  summary,
  keyPoints = [],
  actionItems = [],
  topics = [],
  language = "en",
  wordCount,
}: AISummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = `
# AI Generated Summary

${summary || "No summary available"}

## Key Points
${keyPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")}

## Action Items
${actionItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}

## Topics Discussed
${topics.join(", ")}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!summary && keyPoints.length === 0 && actionItems.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          AI summary is being generated...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          This usually takes 1-2 minutes
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              AI Generated Insights
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Powered by GPT-4
            </p>
          </div>
        </div>

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full" />
            Summary
          </h4>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed pl-3">
            {summary}
          </p>
        </div>
      )}

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Key Points
          </h4>
          <ul className="space-y-2 pl-2">
            {keyPoints.map((point, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2"
              >
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center text-xs font-medium text-purple-600 dark:text-purple-400 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {point}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Action Items
          </h4>
          <ul className="space-y-2 pl-2">
            {actionItems.map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2"
              >
                <div className="flex-shrink-0 w-5 h-5 border-2 border-green-600 rounded mt-0.5" />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {item}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-pink-600" />
            Topics Discussed
          </h4>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              >
                {topic}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="pt-4 border-t border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Language: {language.toUpperCase()}</span>
        {wordCount && <span>{wordCount.toLocaleString()} words transcribed</span>}
        <span className="text-purple-600 dark:text-purple-400">
          Generated with GPT-4
        </span>
      </div>
    </motion.div>
  );
}
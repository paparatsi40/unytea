"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  sessionTitle: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  sessionTitle,
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment || undefined);
      setSubmitted(true);
      
      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              {!submitted ? (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        How was the session?
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {sessionTitle}
                      </p>
                    </div>
                    <button
                      onClick={handleSkip}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Star Rating */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Your rating
                    </label>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-12 h-12 transition-all ${
                              star <= (hoveredRating || rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Comment (Optional) */}
                  <div className="mb-6">
                    <label
                      htmlFor="comment"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Comments (optional)
                    </label>
                    <textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What did you like? What could be improved?"
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSkip}
                      className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={rating === 0 || isSubmitting}
                      className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Success State */
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <svg
                      className="w-10 h-10 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Thank you for your feedback!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your input helps us improve
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

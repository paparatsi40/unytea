"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, CheckCircle, X, Clock } from "lucide-react";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[]; // User IDs who voted
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
  endsAt?: number; // Optional end time
  isActive: boolean;
  totalVotes: number;
  allowMultiple?: boolean; // Allow multiple choice
  correctAnswer?: string; // For quizzes
  showResults?: boolean; // Show results immediately or after voting
}

interface LivePollProps {
  poll: Poll;
  currentUserId: string;
  onVote: (pollId: string, optionId: string) => void;
  onClose?: () => void;
  isModerator?: boolean;
}

export function LivePoll({
  poll,
  currentUserId,
  onVote,
  onClose,
  isModerator = false,
}: LivePollProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Check if user has already voted
  useEffect(() => {
    const voted = poll.options.some((option) => option.voters.includes(currentUserId));
    setHasVoted(voted);
    
    if (voted) {
      const votedOption = poll.options.find((option) =>
        option.voters.includes(currentUserId)
      );
      if (votedOption) {
        setSelectedOption(votedOption.id);
      }
    }
  }, [poll, currentUserId]);

  // Countdown timer
  useEffect(() => {
    if (!poll.endsAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, poll.endsAt! - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [poll.endsAt]);

  const handleVote = () => {
    if (!selectedOption || hasVoted) return;
    
    onVote(poll.id, selectedOption);
    setHasVoted(true);
  };

  const showResults = hasVoted || !poll.isActive || poll.showResults;
  const isExpired = poll.endsAt && Date.now() > poll.endsAt;

  // Calculate percentages
  const getPercentage = (votes: number) => {
    const total = poll.totalVotes;
    if (total === 0) return 0;
    if (votes > total) return 100;
    return Math.round((votes / total) * 100);
  };

  // Debug: Log poll prop when it changes
  useEffect(() => {
    console.log("📊 Poll state in LivePoll component:", {
      id: poll.id,
      question: poll.question,
      totalVotes: poll.totalVotes,
      options: poll.options.map(o => ({
        text: o.text,
        votes: o.votes,
        voters: o.voters.length,
        percentage: poll.totalVotes > 0 ? Math.round((o.votes / poll.totalVotes) * 100) : 0
      }))
    });
  }, [poll, poll.totalVotes, poll.options]);

  // Format time remaining
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-2xl w-full"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">{poll.question}</h3>
              <p className="text-sm opacity-90">
                by {poll.createdByName} • {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Timer */}
        {poll.endsAt && timeRemaining !== null && timeRemaining > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Time remaining: {formatTime(timeRemaining)}
            </span>
          </div>
        )}

        {isExpired && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/20 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Poll ended</span>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="p-6 space-y-3">
        {poll.options.map((option) => (
          <PollOptionComponent
            key={option.id}
            option={option}
            isSelected={selectedOption === option.id}
            onSelect={() => !hasVoted && !isExpired && setSelectedOption(option.id)}
            showResults={showResults}
            percentage={getPercentage(option.votes)}
            isCorrect={poll.correctAnswer === option.id}
            hasVoted={hasVoted}
            disabled={hasVoted || isExpired}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {!hasVoted && !isExpired ? (
          <button
            onClick={handleVote}
            disabled={!selectedOption}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Submit Vote
          </button>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {hasVoted ? "You voted!" : "Poll ended"}
            </p>
          </div>
        )}

        {/* Quiz results */}
        {hasVoted && poll.correctAnswer && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
              {selectedOption === poll.correctAnswer ? "✅ Correct!" : "❌ Incorrect"}
            </p>
            {selectedOption !== poll.correctAnswer && (
              <p className="text-xs text-green-700 dark:text-green-300">
                The correct answer was:{" "}
                {poll.options.find((o) => o.id === poll.correctAnswer)?.text}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Individual Poll Option Component
 */
interface PollOptionComponentProps {
  option: PollOption;
  isSelected: boolean;
  onSelect: () => void;
  showResults: boolean;
  percentage: number;
  isCorrect?: boolean;
  hasVoted: boolean;
  disabled: boolean;
}

function PollOptionComponent({
  option,
  isSelected,
  onSelect,
  showResults,
  percentage,
  isCorrect,
  hasVoted,
  disabled,
}: PollOptionComponentProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative w-full text-left p-4 rounded-lg border-2 transition-all overflow-hidden ${
        isSelected
          ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
          : "border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500"
      } ${disabled && !isSelected ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {/* Progress Bar Background */}
      {showResults && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`absolute inset-0 ${
            isCorrect && hasVoted
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-gray-100 dark:bg-gray-700/30"
          }`}
        />
      )}

      {/* Content */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Radio/Checkbox */}
          <div
            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              isSelected
                ? "border-purple-600 bg-purple-600"
                : "border-gray-400 dark:border-gray-500"
            }`}
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 bg-white rounded-full"
              />
            )}
          </div>

          {/* Text */}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {option.text}
          </span>

          {/* Correct indicator */}
          {isCorrect && hasVoted && (
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          )}
        </div>

        {/* Percentage */}
        {showResults && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold text-gray-700 dark:text-gray-300 flex-shrink-0"
          >
            {percentage}%
          </motion.span>
        )}
      </div>

      {/* Vote count */}
      {showResults && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative mt-1 text-xs text-gray-600 dark:text-gray-400"
        >
          {option.votes} vote{option.votes !== 1 ? "s" : ""}
        </motion.p>
      )}
    </button>
  );
}

/**
 * Poll Creator Component (for moderators)
 */
interface PollCreatorProps {
  onCreatePoll: (question: string, options: string[], duration?: number, isQuiz?: boolean, correctAnswer?: string) => void;
  onClose: () => void;
}

export function PollCreator({ onCreatePoll, onClose }: PollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [duration, setDuration] = useState<number>(60); // seconds
  const [isQuiz, setIsQuiz] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    if (!question.trim()) return;
    if (options.filter((o) => o.trim()).length < 2) return;

    const validOptions = options.filter((o) => o.trim());
    onCreatePoll(
      question,
      validOptions,
      duration > 0 ? duration : undefined,
      isQuiz,
      isQuiz ? validOptions[correctAnswer] : undefined
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-2xl w-full"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create Poll/Quiz</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-4">
        {/* Question */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's your question?"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                {isQuiz && (
                  <button
                    onClick={() => setCorrectAnswer(index)}
                    className={`w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      correctAnswer === index
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-400 dark:border-gray-500"
                    }`}
                    title="Mark as correct answer"
                  >
                    {correctAnswer === index && <CheckCircle className="w-4 h-4" />}
                  </button>
                )}
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addOption}
            className="mt-2 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium"
          >
            + Add option
          </button>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <button
              onClick={() => setIsQuiz(!isQuiz)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isQuiz
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {isQuiz ? "Quiz Mode" : "Poll Mode"}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
          className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Create {isQuiz ? "Quiz" : "Poll"}
        </button>
      </div>
    </motion.div>
  );
}

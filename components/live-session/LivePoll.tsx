"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
}

export function LivePoll({ poll, currentUserId, onVote, onClose }: LivePollProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Check if user has already voted
  useEffect(() => {
    const voted = poll.options.some((option) => option.voters.includes(currentUserId));
    setHasVoted(voted);

    if (voted) {
      const votedOption = poll.options.find((option) => option.voters.includes(currentUserId));
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

  const showResults = Boolean(hasVoted || !poll.isActive || poll.showResults);
  const isExpired = Boolean(poll.endsAt && Date.now() > poll.endsAt);

  // Calculate percentages
  const getPercentage = (votes: number) => {
    if (poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

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
      className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold">{poll.question}</h3>
              <p className="text-sm opacity-90">
                by {poll.createdByName} • {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {onClose && (
            <button onClick={onClose} className="text-white/80 transition-colors hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Timer */}
        {poll.endsAt && timeRemaining !== null && timeRemaining > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Time remaining: {formatTime(timeRemaining)}</span>
          </div>
        )}

        {isExpired && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Poll ended</span>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3 p-6">
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
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        {!hasVoted && !isExpired ? (
          <button
            onClick={handleVote}
            disabled={!selectedOption}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            <CheckCircle className="h-5 w-5" />
            Submit Vote
          </button>
        ) : (
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              {hasVoted ? "You voted!" : "Poll ended"}
            </p>
          </div>
        )}

        {/* Quiz results */}
        {hasVoted && poll.correctAnswer && (
          <div className="mt-4 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20">
            <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">
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
      className={`relative w-full overflow-hidden rounded-lg border-2 p-4 text-left transition-all ${
        isSelected
          ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
          : "border-gray-300 hover:border-purple-400 dark:border-gray-600 dark:hover:border-purple-500"
      } ${disabled && !isSelected ? "cursor-not-allowed opacity-60" : ""}`}
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
        <div className="flex flex-1 items-center gap-3">
          {/* Radio/Checkbox */}
          <div
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
              isSelected
                ? "border-purple-600 bg-purple-600"
                : "border-gray-400 dark:border-gray-500"
            }`}
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="h-2 w-2 rounded-full bg-white"
              />
            )}
          </div>

          {/* Text */}
          <span className="text-sm font-medium text-gray-900 dark:text-white">{option.text}</span>

          {/* Correct indicator */}
          {isCorrect && hasVoted && (
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
          )}
        </div>

        {/* Percentage */}
        {showResults && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300"
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
  onCreatePoll: (
    question: string,
    options: string[],
    duration?: number,
    isQuiz?: boolean,
    correctAnswer?: string
  ) => void;
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
      className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create Poll/Quiz</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 p-6">
        {/* Question */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's your question?"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Options */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                {isQuiz && (
                  <button
                    onClick={() => setCorrectAnswer(index)}
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      correctAnswer === index
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-400 dark:border-gray-500"
                    }`}
                    title="Mark as correct answer"
                  >
                    {correctAnswer === index && <CheckCircle className="h-4 w-4" />}
                  </button>
                )}
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addOption}
            className="mt-2 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            + Add option
          </button>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min="0"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>
            <button
              onClick={() => setIsQuiz(!isQuiz)}
              className={`w-full rounded-lg px-4 py-2 font-medium transition-colors ${
                isQuiz
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {isQuiz ? "Quiz Mode" : "Poll Mode"}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
          className="flex-1 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Create {isQuiz ? "Quiz" : "Poll"}
        </button>
      </div>
    </motion.div>
  );
}

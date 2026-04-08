"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trophy,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { submitQuizAttempt } from "@/app/actions/quizzes";

interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE";
  options: QuizOption[];
  explanation?: string;
  points: number;
  position: number;
}

interface QuizData {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  maxAttempts?: number | null;
  timeLimit?: number | null;
  shuffleQuestions: boolean;
  showResults: boolean;
  questions: QuizQuestion[];
  attemptsUsed: number;
  bestScore: number | null;
  hasPassed: boolean;
}

interface QuizResult {
  score: number;
  passed: boolean;
  pointsEarned: number;
  totalPoints: number;
  answers: { questionId: string; selectedOptionIds: string[]; isCorrect: boolean }[];
}

interface QuizPlayerProps {
  quiz: QuizData;
  onComplete?: (result: QuizResult) => void;
  onClose?: () => void;
}

export function QuizPlayer({ quiz, onComplete, onClose }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.timeLimit ? quiz.timeLimit * 60 : null
  );
  const [started, setStarted] = useState(false);

  const questions = quiz.shuffleQuestions
    ? [...quiz.questions].sort(() => Math.random() - 0.5)
    : quiz.questions;

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const canRetry =
    !quiz.maxAttempts || quiz.attemptsUsed < quiz.maxAttempts;

  // Timer
  useEffect(() => {
    if (!started || timeLeft === null || timeLeft <= 0 || result) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, timeLeft, result]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0 && !result && started) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const handleSelectOption = useCallback(
    (questionId: string, optionId: string, isMultiSelect: boolean) => {
      setAnswers((prev) => {
        const current = prev[questionId] || [];
        if (isMultiSelect) {
          const updated = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
          return { ...prev, [questionId]: updated };
        }
        return { ...prev, [questionId]: [optionId] };
      });
    },
    []
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: answers[q.id] || [],
      }));

      const timeSpent = quiz.timeLimit
        ? quiz.timeLimit * 60 - (timeLeft || 0)
        : undefined;

      const res = await submitQuizAttempt({
        quizId: quiz.id,
        answers: formattedAnswers,
        timeSpent,
      });

      if (res.success && res.attempt) {
        const quizResult: QuizResult = {
          score: res.attempt.score,
          passed: res.attempt.passed,
          pointsEarned: res.attempt.pointsEarned,
          totalPoints: res.attempt.totalPoints,
          answers: res.attempt.answers,
        };
        setResult(quizResult);
        onComplete?.(quizResult);
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setStarted(false);
    setTimeLeft(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Start Screen ─────────────────────────────────────────────
  if (!started) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h3 className="mb-2 text-xl font-bold text-white">{quiz.title}</h3>
        {quiz.description && (
          <p className="mb-4 text-sm text-zinc-400">{quiz.description}</p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="text-zinc-500">Questions</p>
            <p className="font-semibold text-white">{totalQuestions}</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="text-zinc-500">Passing Score</p>
            <p className="font-semibold text-white">{quiz.passingScore}%</p>
          </div>
          {quiz.timeLimit && (
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Time Limit</p>
              <p className="font-semibold text-white">{quiz.timeLimit} min</p>
            </div>
          )}
          {quiz.maxAttempts && (
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Attempts</p>
              <p className="font-semibold text-white">
                {quiz.attemptsUsed}/{quiz.maxAttempts}
              </p>
            </div>
          )}
        </div>

        {quiz.bestScore !== null && (
          <div className="mb-4 rounded-lg bg-purple-500/10 border border-purple-500/20 p-3">
            <p className="text-sm text-purple-300">
              Best score: <span className="font-bold">{Math.round(quiz.bestScore)}%</span>
              {quiz.hasPassed && " ✓ Passed"}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStarted(true)}
            disabled={!canRetry}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {quiz.attemptsUsed > 0 ? "Retry Quiz" : "Start Quiz"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
          )}
        </div>

        {!canRetry && (
          <p className="mt-2 text-xs text-red-400">
            Maximum attempts reached.
          </p>
        )}
      </div>
    );
  }

  // ── Result Screen ────────────────────────────────────────────
  if (result) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="mb-6 text-center">
          {result.passed ? (
            <>
              <Trophy className="mx-auto mb-3 h-12 w-12 text-amber-400" />
              <h3 className="text-2xl font-bold text-white">
                Congratulations!
              </h3>
              <p className="text-sm text-emerald-400">You passed the quiz!</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
              <h3 className="text-2xl font-bold text-white">
                Not quite there yet
              </h3>
              <p className="text-sm text-zinc-400">
                You need {quiz.passingScore}% to pass
              </p>
            </>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-white">
              {Math.round(result.score)}%
            </p>
            <p className="text-zinc-500">Score</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-white">
              {result.pointsEarned}/{result.totalPoints}
            </p>
            <p className="text-zinc-500">Points</p>
          </div>
        </div>

        {/* Answer review */}
        {quiz.showResults && (
          <div className="mb-6 space-y-3">
            <h4 className="text-sm font-medium text-zinc-400">Review</h4>
            {questions.map((q, i) => {
              const answer = result.answers.find(
                (a) => a.questionId === q.id
              );
              return (
                <div
                  key={q.id}
                  className={`rounded-lg border p-3 ${
                    answer?.isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {answer?.isCorrect ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm text-white">
                        {i + 1}. {q.question}
                      </p>
                      {q.explanation && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          {canRetry && !result.passed && (
            <button
              onClick={handleRetry}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Question Screen ──────────────────────────────────────────
  const isMultiSelect = currentQuestion.type === "MULTI_SELECT";
  const selected = answers[currentQuestion.id] || [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">
            Question {currentIndex + 1}/{totalQuestions}
          </span>
          {currentQuestion.points > 1 && (
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-300">
              {currentQuestion.points} pts
            </span>
          )}
        </div>
        {timeLeft !== null && (
          <div
            className={`flex items-center gap-1.5 text-sm font-mono ${
              timeLeft < 60 ? "text-red-400" : "text-zinc-400"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-purple-600 transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <h4 className="mb-4 text-lg font-medium text-white">
        {currentQuestion.question}
      </h4>

      {isMultiSelect && (
        <p className="mb-3 text-xs text-zinc-500">Select all that apply</p>
      )}

      {/* Options */}
      <div className="mb-6 space-y-2.5">
        {(currentQuestion.options as QuizOption[]).map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() =>
                handleSelectOption(
                  currentQuestion.id,
                  option.id,
                  isMultiSelect
                )
              }
              className={`w-full rounded-lg border p-3.5 text-left text-sm transition-all ${
                isSelected
                  ? "border-purple-500 bg-purple-500/10 text-white"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-${
                    isMultiSelect ? "md" : "full"
                  } border ${
                    isSelected
                      ? "border-purple-500 bg-purple-500"
                      : "border-zinc-600"
                  }`}
                >
                  {isSelected && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                {option.text}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="text-xs text-zinc-600">
          {answeredCount}/{totalQuestions} answered
        </span>

        {currentIndex < totalQuestions - 1 ? (
          <button
            onClick={() =>
              setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))
            }
            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < totalQuestions}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Submit"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

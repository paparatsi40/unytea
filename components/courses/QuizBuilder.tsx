"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { createQuiz, addQuizQuestion } from "@/app/actions/quizzes";

interface BuilderOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface BuilderQuestion {
  localId: string;
  question: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE";
  options: BuilderOption[];
  explanation: string;
  points: number;
}

interface QuizBuilderProps {
  lessonId: string;
  onSaved?: (quizId: string) => void;
  onCancel?: () => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function createEmptyQuestion(): BuilderQuestion {
  return {
    localId: generateId(),
    question: "",
    type: "MULTIPLE_CHOICE",
    options: [
      { id: generateId(), text: "", isCorrect: true },
      { id: generateId(), text: "", isCorrect: false },
      { id: generateId(), text: "", isCorrect: false },
      { id: generateId(), text: "", isCorrect: false },
    ],
    explanation: "",
    points: 1,
  };
}

function createTrueFalseQuestion(): BuilderQuestion {
  return {
    localId: generateId(),
    question: "",
    type: "TRUE_FALSE",
    options: [
      { id: generateId(), text: "True", isCorrect: true },
      { id: generateId(), text: "False", isCorrect: false },
    ],
    explanation: "",
    points: 1,
  };
}

export function QuizBuilder({ lessonId, onSaved, onCancel }: QuizBuilderProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState<number | undefined>(undefined);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([
    createEmptyQuestion(),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = (type: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE") => {
    if (type === "TRUE_FALSE") {
      setQuestions((prev) => [...prev, createTrueFalseQuestion()]);
    } else {
      const q = createEmptyQuestion();
      q.type = type;
      setQuestions((prev) => [...prev, q]);
    }
  };

  const removeQuestion = (localId: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  };

  const updateQuestion = (
    localId: string,
    field: keyof BuilderQuestion,
    value: string | number | BuilderOption[]
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.localId === localId ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (
    questionLocalId: string,
    optionId: string,
    field: "text" | "isCorrect",
    value: string | boolean
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== questionLocalId) return q;
        const updated = q.options.map((o) => {
          if (o.id === optionId) return { ...o, [field]: value };
          // For single-select, uncheck others when marking one correct
          if (
            field === "isCorrect" &&
            value === true &&
            q.type !== "MULTI_SELECT"
          ) {
            return { ...o, isCorrect: false };
          }
          return o;
        });
        return { ...q, options: updated };
      })
    );
  };

  const addOption = (questionLocalId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== questionLocalId) return q;
        return {
          ...q,
          options: [
            ...q.options,
            { id: generateId(), text: "", isCorrect: false },
          ],
        };
      })
    );
  };

  const removeOption = (questionLocalId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== questionLocalId || q.options.length <= 2) return q;
        return { ...q, options: q.options.filter((o) => o.id !== optionId) };
      })
    );
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Quiz title is required");
      return;
    }
    for (const q of questions) {
      if (!q.question.trim()) {
        setError("All questions must have text");
        return;
      }
      if (q.options.some((o) => !o.text.trim())) {
        setError("All options must have text");
        return;
      }
      if (!q.options.some((o) => o.isCorrect)) {
        setError("Each question must have at least one correct answer");
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Create the quiz
      const quizRes = await createQuiz({
        lessonId,
        title,
        description: description || undefined,
        passingScore,
        maxAttempts,
        timeLimit,
        shuffleQuestions,
      });

      if (!quizRes.success || !quizRes.quiz) {
        setError(quizRes.error || "Failed to create quiz");
        return;
      }

      // 2. Add questions one by one
      for (const q of questions) {
        const qRes = await addQuizQuestion({
          quizId: quizRes.quiz.id,
          question: q.question,
          type: q.type,
          options: q.options,
          explanation: q.explanation || undefined,
          points: q.points,
        });
        if (!qRes.success) {
          setError(`Failed to add question: ${q.question.substring(0, 30)}...`);
          return;
        }
      }

      onSaved?.(quizRes.quiz.id);
    } catch (err) {
      console.error("Failed to save quiz:", err);
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quiz Settings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <h3 className="mb-4 text-lg font-bold text-white">Quiz Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Module 1 Quiz"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional quiz description..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Passing Score (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Max Attempts
              </label>
              <input
                type="number"
                min={1}
                value={maxAttempts || ""}
                onChange={(e) =>
                  setMaxAttempts(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="Unlimited"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Time Limit (min)
              </label>
              <input
                type="number"
                min={1}
                value={timeLimit || ""}
                onChange={(e) =>
                  setTimeLimit(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="None"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
            />
            Shuffle question order
          </label>
        </div>
      </div>

      {/* Questions */}
      {questions.map((q, idx) => (
        <div
          key={q.localId}
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-zinc-600" />
              <span className="text-sm font-medium text-zinc-400">
                Question {idx + 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={q.type}
                onChange={(e) => {
                  const newType = e.target.value as BuilderQuestion["type"];
                  updateQuestion(q.localId, "type", newType);
                  if (newType === "TRUE_FALSE") {
                    updateQuestion(q.localId, "options", [
                      { id: generateId(), text: "True", isCorrect: true },
                      { id: generateId(), text: "False", isCorrect: false },
                    ]);
                  }
                }}
                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:border-purple-500 focus:outline-none"
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="MULTI_SELECT">Multi Select</option>
                <option value="TRUE_FALSE">True / False</option>
              </select>
              <button
                onClick={() => removeQuestion(q.localId)}
                disabled={questions.length <= 1}
                className="p-1 text-zinc-600 hover:text-red-400 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <input
            type="text"
            value={q.question}
            onChange={(e) =>
              updateQuestion(q.localId, "question", e.target.value)
            }
            placeholder="Enter your question..."
            className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
          />

          {/* Options */}
          <div className="mb-3 space-y-2">
            {q.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateOption(q.localId, opt.id, "isCorrect", !opt.isCorrect)
                  }
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-${
                    q.type === "MULTI_SELECT" ? "md" : "full"
                  } border transition-colors ${
                    opt.isCorrect
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-600 hover:border-zinc-500"
                  }`}
                >
                  {opt.isCorrect && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </button>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) =>
                    updateOption(q.localId, opt.id, "text", e.target.value)
                  }
                  placeholder="Option text..."
                  disabled={q.type === "TRUE_FALSE"}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none disabled:opacity-60"
                />
                {q.type !== "TRUE_FALSE" && q.options.length > 2 && (
                  <button
                    onClick={() => removeOption(q.localId, opt.id)}
                    className="p-1 text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {q.type !== "TRUE_FALSE" && (
            <button
              onClick={() => addOption(q.localId)}
              className="mb-3 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Option
            </button>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={q.explanation}
                onChange={(e) =>
                  updateQuestion(q.localId, "explanation", e.target.value)
                }
                placeholder="Explanation (shown after answering)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="w-20">
              <input
                type="number"
                min={1}
                value={q.points}
                onChange={(e) =>
                  updateQuestion(q.localId, "points", Number(e.target.value))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center text-xs text-white focus:border-purple-500 focus:outline-none"
              />
              <p className="mt-0.5 text-center text-[10px] text-zinc-600">
                points
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Add Question Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => addQuestion("MULTIPLE_CHOICE")}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-purple-500 hover:text-purple-400"
        >
          <Plus className="h-4 w-4" />
          Multiple Choice
        </button>
        <button
          onClick={() => addQuestion("MULTI_SELECT")}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-purple-500 hover:text-purple-400"
        >
          <Plus className="h-4 w-4" />
          Multi Select
        </button>
        <button
          onClick={() => addQuestion("TRUE_FALSE")}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-purple-500 hover:text-purple-400"
        >
          <Plus className="h-4 w-4" />
          True / False
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Quiz"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

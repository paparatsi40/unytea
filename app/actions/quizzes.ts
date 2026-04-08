"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth-utils";
import { recordActivity } from "@/lib/streaks";

// ── Types ─────────────────────────────────────────────────────────────
export interface QuizQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
}

// ── Create Quiz (for course creators) ─────────────────────────────────
export async function createQuiz(data: {
  lessonId: string;
  title: string;
  description?: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
}) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        passingScore: data.passingScore ?? 70,
        maxAttempts: data.maxAttempts,
        timeLimit: data.timeLimit,
        shuffleQuestions: data.shuffleQuestions ?? false,
        showResults: data.showResults ?? true,
        lessonId: data.lessonId,
      },
    });

    return { success: true, quiz };
  } catch (error) {
    console.error("[createQuiz] Error:", error);
    return { success: false, error: "Failed to create quiz" };
  }
}

// ── Add Question to Quiz ──────────────────────────────────────────────
export async function addQuizQuestion(data: {
  quizId: string;
  question: string;
  type?: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE";
  options: QuizQuestionOption[];
  explanation?: string;
  points?: number;
}) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Get next position
    const lastQuestion = await prisma.quizQuestion.findFirst({
      where: { quizId: data.quizId },
      orderBy: { position: "desc" },
    });

    const question = await prisma.quizQuestion.create({
      data: {
        question: data.question,
        type: data.type || "MULTIPLE_CHOICE",
        options: data.options as unknown as Prisma.InputJsonValue,
        explanation: data.explanation,
        points: data.points ?? 1,
        position: (lastQuestion?.position ?? -1) + 1,
        quizId: data.quizId,
      },
    });

    return { success: true, question };
  } catch (error) {
    console.error("[addQuizQuestion] Error:", error);
    return { success: false, error: "Failed to add question" };
  }
}

// ── Get Quiz with Questions ───────────────────────────────────────────
export async function getQuiz(quizId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
        attempts: {
          where: { userId },
          orderBy: { startedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!quiz) return { success: false, error: "Quiz not found" };

    // For the student view, strip correct answers if showResults is false and they haven't completed
    const hasPassedAttempt = quiz.attempts.some((a: { passed: boolean }) => a.passed);

    const sanitizedQuestions = quiz.questions.map((q: { id: string; question: string; type: string; options: unknown; explanation: string | null; points: number; position: number }) => {
      const options = q.options as unknown as QuizQuestionOption[];
      return {
        ...q,
        options: hasPassedAttempt || quiz.showResults
          ? options
          : options.map((o) => ({ ...o, isCorrect: undefined })),
        explanation: hasPassedAttempt ? q.explanation : undefined,
      };
    });

    return {
      success: true,
      quiz: {
        ...quiz,
        questions: sanitizedQuestions,
        attemptsUsed: quiz.attempts.length,
        bestScore: quiz.attempts.length > 0
          ? Math.max(...quiz.attempts.map((a: { score: number }) => a.score))
          : null,
        hasPassed: hasPassedAttempt,
      },
    };
  } catch (error) {
    console.error("[getQuiz] Error:", error);
    return { success: false, error: "Failed to get quiz" };
  }
}

// ── Get Quizzes for a Lesson ──────────────────────────────────────────
export async function getLessonQuizzes(lessonId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const quizzes = await prisma.quiz.findMany({
      where: { lessonId },
      include: {
        _count: { select: { questions: true, attempts: true } },
        attempts: {
          where: { userId },
          orderBy: { score: "desc" },
          take: 1,
        },
      },
      orderBy: { position: "asc" },
    });

    return {
      success: true,
      quizzes: quizzes.map((q: { id: string; title: string; description: string | null; passingScore: number; maxAttempts: number | null; timeLimit: number | null; _count: { questions: number; attempts: number }; attempts: { score: number; passed: boolean }[] }) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        passingScore: q.passingScore,
        questionCount: q._count.questions,
        totalAttempts: q._count.attempts,
        bestScore: q.attempts[0]?.score ?? null,
        hasPassed: q.attempts[0]?.passed ?? false,
        maxAttempts: q.maxAttempts,
        timeLimit: q.timeLimit,
      })),
    };
  } catch (error) {
    console.error("[getLessonQuizzes] Error:", error);
    return { success: false, error: "Failed to get quizzes" };
  }
}

// ── Submit Quiz Attempt ───────────────────────────────────────────────
export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; selectedOptionIds: string[] }[];
  timeSpent?: number;
}) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Get the quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
      include: {
        questions: true,
        attempts: {
          where: { userId },
        },
      },
    });

    if (!quiz) return { success: false, error: "Quiz not found" };

    // Check max attempts
    if (quiz.maxAttempts && quiz.attempts.length >= quiz.maxAttempts) {
      return { success: false, error: "Maximum attempts reached" };
    }

    // Grade the quiz
    let earnedPoints = 0;
    let totalPoints = 0;

    const gradedAnswers: QuizAnswer[] = data.answers.map((answer) => {
      const question = quiz.questions.find((q: { id: string; options: unknown; points: number }) => q.id === answer.questionId);
      if (!question) {
        return { ...answer, isCorrect: false };
      }

      totalPoints += question.points;
      const options = question.options as unknown as QuizQuestionOption[];
      const correctOptionIds = options
        .filter((o) => o.isCorrect)
        .map((o) => o.id);

      // Check if the answer is correct
      const isCorrect =
        correctOptionIds.length === answer.selectedOptionIds.length &&
        correctOptionIds.every((id) => answer.selectedOptionIds.includes(id));

      if (isCorrect) {
        earnedPoints += question.points;
      }

      return { ...answer, isCorrect };
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;

    // Save attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId: data.quizId,
        answers: gradedAnswers as unknown as Prisma.InputJsonValue,
        score,
        passed,
        pointsEarned: earnedPoints,
        totalPoints,
        timeSpent: data.timeSpent,
        completedAt: new Date(),
      },
    });

    // Award XP for completing a quiz (non-blocking)
    const xpEarned = passed ? 25 : 10;
    recordActivity(userId, "resource", xpEarned).catch(console.error);

    return {
      success: true,
      attempt: {
        id: attempt.id,
        score,
        passed,
        pointsEarned: earnedPoints,
        totalPoints,
        answers: gradedAnswers,
      },
    };
  } catch (error) {
    console.error("[submitQuizAttempt] Error:", error);
    return { success: false, error: "Failed to submit quiz" };
  }
}

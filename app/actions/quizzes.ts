"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { defineAction } from "@/lib/actions/define-action";
import { communityOfLesson, communityOfQuiz } from "@/lib/actions/resolvers";

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
export const createQuiz = defineAction(
  {
    name: "createQuiz",
    auth: "admin",
    args: [
      z.object({
        lessonId: z.string().min(1).max(64),
        title: z.string().min(1).max(300),
        description: z.string().max(5000).optional(),
        passingScore: z.number().int().min(0).max(100).optional(),
        maxAttempts: z.number().int().min(1).max(100).optional(),
        timeLimit: z.number().int().min(1).max(1440).optional(),
        shuffleQuestions: z.boolean().optional(),
        showResults: z.boolean().optional(),
      }),
    ],
    community: ([data]) => communityOfLesson(data.lessonId),
  },
  async (
    _ctx,
    data: {
      lessonId: string;
      title: string;
      description?: string;
      passingScore?: number;
      maxAttempts?: number;
      timeLimit?: number;
      shuffleQuestions?: boolean;
      showResults?: boolean;
    }
  ) => {
    try {
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
);

// ── Add Question to Quiz ──────────────────────────────────────────────
export const addQuizQuestion = defineAction(
  {
    name: "addQuizQuestion",
    auth: "admin",
    args: [
      z.object({
        quizId: z.string().min(1).max(64),
        question: z.string().min(1).max(5000),
        type: z.enum(["MULTIPLE_CHOICE", "MULTI_SELECT", "TRUE_FALSE"]).optional(),
        options: z
          .array(
            z.object({
              id: z.string().min(1).max(64),
              text: z.string().max(2000),
              isCorrect: z.boolean(),
            })
          )
          .max(50),
        explanation: z.string().max(5000).optional(),
        points: z.number().int().min(0).max(1000).optional(),
        order: z.number().int().min(0).max(10_000).optional(),
      }),
    ],
    community: ([data]) => communityOfQuiz(data.quizId),
  },
  async (
    _ctx,
    data: {
      quizId: string;
      question: string;
      type?: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE";
      options: QuizQuestionOption[];
      explanation?: string;
      points?: number;
    }
  ) => {
    try {
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
);

// ── Get Quiz with Questions ───────────────────────────────────────────
export const getQuiz = defineAction(
  {
    name: "getQuiz",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([quizId]) => communityOfQuiz(quizId),
  },
  async (ctx, quizId: string) => {
    try {
      const userId = ctx.userId;

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

      const sanitizedQuestions = quiz.questions.map(
        (q: {
          id: string;
          question: string;
          type: string;
          options: unknown;
          explanation: string | null;
          points: number;
          position: number;
        }) => {
          const options = q.options as unknown as QuizQuestionOption[];
          return {
            ...q,
            options:
              hasPassedAttempt || quiz.showResults
                ? options
                : options.map((o) => ({ ...o, isCorrect: undefined })),
            explanation: hasPassedAttempt ? q.explanation : undefined,
          };
        }
      );

      return {
        success: true,
        quiz: {
          ...quiz,
          questions: sanitizedQuestions,
          attemptsUsed: quiz.attempts.length,
          bestScore:
            quiz.attempts.length > 0
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
);

// ── Get Quizzes for a Lesson ──────────────────────────────────────────
export const getLessonQuizzes = defineAction(
  {
    name: "getLessonQuizzes",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([lessonId]) => communityOfLesson(lessonId),
  },
  async (ctx, lessonId: string) => {
    try {
      const userId = ctx.userId;

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
        quizzes: quizzes.map(
          (q: {
            id: string;
            title: string;
            description: string | null;
            passingScore: number;
            maxAttempts: number | null;
            timeLimit: number | null;
            _count: { questions: number; attempts: number };
            attempts: { score: number; passed: boolean }[];
          }) => ({
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
          })
        ),
      };
    } catch (error) {
      console.error("[getLessonQuizzes] Error:", error);
      return { success: false, error: "Failed to get quizzes" };
    }
  }
);

// ── Submit Quiz Attempt ───────────────────────────────────────────────
export const submitQuizAttempt = defineAction(
  {
    name: "submitQuizAttempt",
    auth: "member",
    args: [
      z.object({
        quizId: z.string().min(1).max(64),
        answers: z
          .array(
            z.object({
              questionId: z.string().min(1).max(64),
              selectedOptionIds: z.array(z.string().min(1).max(64)).max(50),
            })
          )
          .max(500),
        timeSpent: z.number().int().min(0).max(86_400).optional(),
      }),
    ],
    community: ([data]) => communityOfQuiz(data.quizId),
    rateLimit: "create",
  },
  async (
    ctx,
    data: {
      quizId: string;
      answers: { questionId: string; selectedOptionIds: string[] }[];
      timeSpent?: number;
    }
  ) => {
    try {
      const userId = ctx.userId;

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
        const question = quiz.questions.find(
          (q: { id: string; options: unknown; points: number }) => q.id === answer.questionId
        );
        if (!question) {
          return { ...answer, isCorrect: false };
        }

        totalPoints += question.points;
        const options = question.options as unknown as QuizQuestionOption[];
        const correctOptionIds = options.filter((o) => o.isCorrect).map((o) => o.id);

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
);

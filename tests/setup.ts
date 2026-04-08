import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    community: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    member: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    subscription: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    coursePurchase: { create: vi.fn(), findUnique: vi.fn() },
    course: { findUnique: vi.fn(), update: vi.fn() },
    post: { findMany: vi.fn(), create: vi.fn() },
    mentorSession: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn((fn) => fn()),
  },
}))

vi.mock('@/lib/auth', () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }))
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendSessionReminderEmail: vi.fn().mockResolvedValue(undefined),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password'), compare: vi.fn() },
}))

const mockRateLimitCheck = vi.fn().mockReturnValue({ success: true, remaining: 4, resetTime: Date.now() + 900000 })
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: { auth: { check: (...args: unknown[]) => mockRateLimitCheck(...args) } },
  getIP: vi.fn().mockReturnValue('127.0.0.1'),
}))
vi.mock('@/lib/email', () => ({ sendWelcomeEmail: vi.fn().mockResolvedValue(undefined) }))

import { prisma } from '@/lib/prisma'

describe('POST /api/auth/signup', () => {
  let POST: (req: NextRequest) => Promise<Response>
  beforeEach(async () => {
    vi.clearAllMocks()
    mockRateLimitCheck.mockReturnValue({ success: true, remaining: 4, resetTime: Date.now() + 900000 })
    const mod = await import('@/app/api/auth/signup/route')
    POST = mod.POST
  })
  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
    })
  }
  it('should return 429 when rate limited', async () => {
    mockRateLimitCheck.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 900000 })
    const res = await POST(makeRequest({ name: 'Test', email: 'test@example.com', password: 'password123' }))
    expect(res.status).toBe(429)
  })
  it('should return 400 for invalid email', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'not-an-email', password: 'password123' }))
    expect(res.status).toBe(400)
  })
  it('should return 400 for short password', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'test@example.com', password: '123' }))
    expect(res.status).toBe(400)
  })
  it('should return generic 201 for existing user (no email enumeration)', async () => {
    // Partial User stub — mockResolvedValue's typed signature wants the full
    // User shape but the route only reads `id`/`email`, so cast to satisfy TS.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing-user', email: 'existing@example.com' } as never)
    const res = await POST(makeRequest({ name: 'Test', email: 'existing@example.com', password: 'password123' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(JSON.stringify(data)).not.toContain('already')
    expect(data.message).toContain('If this email is available')
  })
  it('should return 201 for new user with generic message', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'new', email: 'new@example.com', name: 'Test' } as never)
    const res = await POST(makeRequest({ name: 'Test', email: 'new@example.com', password: 'password123' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.message).toContain('If this email is available')
    expect(data.user).toBeUndefined()
  })
  it('should hash the password before storing', async () => {
    const bcrypt = await import('bcryptjs')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({} as never)
    await POST(makeRequest({ name: 'Test', email: 'new@example.com', password: 'mypassword123' }))
    expect(bcrypt.default.hash).toHaveBeenCalledWith('mypassword123', 10)
  })
  it('should return identical responses for existing and new users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'x' } as never)
    const r1 = await POST(makeRequest({ name: 'A', email: 'a@test.com', password: 'password123' }))
    const d1 = await r1.json()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({} as never)
    const r2 = await POST(makeRequest({ name: 'B', email: 'b@test.com', password: 'password123' }))
    const d2 = await r2.json()
    expect(r1.status).toBe(r2.status)
    expect(d1.message).toBe(d2.message)
  })
})

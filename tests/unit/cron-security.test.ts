import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/app/actions/session-jobs', () => ({
  runSessionJobs: vi.fn().mockResolvedValue({ success: true, results: [] }),
  sendSessionReminders: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/autopilot', () => ({
  runAutopilotDueJobs: vi.fn().mockResolvedValue({ success: true }),
}))

describe('Cron Route Security', () => {
  const originalEnv = process.env
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: 'test-secret-123' }
  })
  afterEach(() => { process.env = originalEnv })

  describe('GET /api/cron/sessions', () => {
    let GET
    beforeEach(async () => {
      const mod = await import('@/app/api/cron/sessions/route')
      GET = mod.GET
    })
    it('should reject requests without secret', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions')
      expect((await GET(req)).status).toBe(401)
    })
    it('should reject requests with wrong secret', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions', {
        headers: { 'x-cron-secret': 'wrong-secret' },
      })
      expect((await GET(req)).status).toBe(401)
    })
    it('should accept correct x-cron-secret header', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions', {
        headers: { 'x-cron-secret': 'test-secret-123' },
      })
      expect((await GET(req)).status).toBe(200)
    })
    it('should accept correct Authorization Bearer header', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions', {
        headers: { 'authorization': 'Bearer test-secret-123' },
      })
      expect((await GET(req)).status).toBe(200)
    })
    it('should NOT accept secret from query parameters', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions?secret=test-secret-123')
      expect((await GET(req)).status).toBe(401)
    })
  })
})

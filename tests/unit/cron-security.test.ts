import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'

vi.mock('@/app/actions/session-jobs', () => ({
  runSessionJobs: vi.fn().mockResolvedValue({ success: true, results: [] }),
  sendSessionReminders: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/autopilot', () => ({
  runAutopilotDueJobs: vi.fn().mockResolvedValue({ success: true }),
}))

const SECRET = 'test-secret-123'

function buildReq(headers: Record<string, string> = {}, url = 'http://localhost:3000/api/cron/sessions') {
  return new NextRequest(url, { headers })
}

describe('verifyCronAuth helper', () => {
  const originalEnv = process.env
  beforeEach(() => {
    process.env = { ...originalEnv, CRON_SECRET: SECRET }
  })
  afterEach(() => { process.env = originalEnv })

  it('fail-closed: returns 500 when CRON_SECRET env var is missing', async () => {
    delete process.env.CRON_SECRET
    const res = verifyCronAuth(buildReq({ 'x-cron-secret': SECRET }))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(500)
    const body = await res!.json()
    expect(body).toEqual({ success: false, error: 'Server misconfigured' })
  })

  it('fail-closed: returns 500 when CRON_SECRET is empty string', async () => {
    process.env.CRON_SECRET = ''
    const res = verifyCronAuth(buildReq({ 'x-cron-secret': '' }))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(500)
  })

  it('returns 401 with no headers', async () => {
    const res = verifyCronAuth(buildReq())
    expect(res!.status).toBe(401)
    const body = await res!.json()
    expect(body).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('returns 401 with wrong secret via x-cron-secret header', async () => {
    const res = verifyCronAuth(buildReq({ 'x-cron-secret': 'wrong-secret-of-same-length-x' }))
    expect(res!.status).toBe(401)
  })

  it('returns 401 with wrong secret via Authorization Bearer', async () => {
    const res = verifyCronAuth(buildReq({ authorization: 'Bearer wrong-secret' }))
    expect(res!.status).toBe(401)
  })

  it('returns 401 with mismatched-length secrets (no timing leak path)', async () => {
    // Shorter than expected — must NOT throw from timingSafeEqual, must return 401
    const res = verifyCronAuth(buildReq({ 'x-cron-secret': 'short' }))
    expect(res!.status).toBe(401)
  })

  it('returns null (success) with correct x-cron-secret', async () => {
    const res = verifyCronAuth(buildReq({ 'x-cron-secret': SECRET }))
    expect(res).toBeNull()
  })

  it('returns null (success) with correct Authorization Bearer', async () => {
    const res = verifyCronAuth(buildReq({ authorization: `Bearer ${SECRET}` }))
    expect(res).toBeNull()
  })

  it('returns null (success) with case-insensitive Bearer prefix', async () => {
    const res = verifyCronAuth(buildReq({ authorization: `bearer ${SECRET}` }))
    expect(res).toBeNull()
  })

  it('does NOT read secret from query parameters', async () => {
    const res = verifyCronAuth(buildReq({}, `http://localhost:3000/api/cron/sessions?secret=${SECRET}`))
    expect(res!.status).toBe(401)
  })
})

describe('Cron route handlers — integration', () => {
  const originalEnv = process.env
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: SECRET }
  })
  afterEach(() => { process.env = originalEnv })

  describe('GET /api/cron/sessions', () => {
    let GET: (req: NextRequest) => Promise<Response>
    beforeEach(async () => {
      const mod = await import('@/app/api/cron/sessions/route')
      GET = mod.GET
    })
    it('rejects requests without secret', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions')
      expect((await GET(req)).status).toBe(401)
    })
    it('rejects requests with wrong secret', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions', {
        headers: { 'x-cron-secret': 'wrong-secret' },
      })
      expect((await GET(req)).status).toBe(401)
    })
    it('accepts correct x-cron-secret header', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions', {
        headers: { 'x-cron-secret': SECRET },
      })
      expect((await GET(req)).status).toBe(200)
    })
    it('accepts correct Authorization Bearer header', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/sessions', {
        headers: { authorization: `Bearer ${SECRET}` },
      })
      expect((await GET(req)).status).toBe(200)
    })
    it('does NOT accept secret from query parameters', async () => {
      const req = new NextRequest(`http://localhost:3000/api/cron/sessions?secret=${SECRET}`)
      expect((await GET(req)).status).toBe(401)
    })
    it('returns 500 when CRON_SECRET env var is missing (fail-closed)', async () => {
      delete process.env.CRON_SECRET
      const req = new NextRequest('http://localhost:3000/api/cron/sessions', {
        headers: { 'x-cron-secret': SECRET },
      })
      expect((await GET(req)).status).toBe(500)
    })
  })
})

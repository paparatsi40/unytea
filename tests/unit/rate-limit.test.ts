import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, getIP, getIdentifier } from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  describe('rateLimit', () => {
    let limiter: ReturnType<typeof rateLimit>
    beforeEach(() => {
      limiter = rateLimit({ interval: 1000, uniqueTokenPerInterval: 3 })
    })
    it('should allow requests under the limit', () => {
      const result = limiter.check('test-token')
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(2)
    })
    it('should track remaining requests correctly', () => {
      expect(limiter.check('u1').remaining).toBe(2)
      expect(limiter.check('u1').remaining).toBe(1)
      expect(limiter.check('u1').remaining).toBe(0)
    })
    it('should block requests over the limit', () => {
      limiter.check('u2'); limiter.check('u2'); limiter.check('u2')
      expect(limiter.check('u2').success).toBe(false)
    })
    it('should track different tokens independently', () => {
      limiter.check('a'); limiter.check('a'); limiter.check('a')
      expect(limiter.check('a').success).toBe(false)
      expect(limiter.check('b').success).toBe(true)
    })
    it('should reset after the interval expires', async () => {
      limiter.check('u3'); limiter.check('u3'); limiter.check('u3')
      expect(limiter.check('u3').success).toBe(false)
      await new Promise((resolve) => setTimeout(resolve, 1100))
      expect(limiter.check('u3').success).toBe(true)
    })
    it('should return resetTime in the future', () => {
      expect(limiter.check('u4').resetTime).toBeGreaterThan(Date.now())
    })
  })
  describe('getIP', () => {
    it('should extract IP from x-forwarded-for', () => {
      const req = { headers: new Headers({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }), ip: undefined } as any
      expect(getIP(req)).toBe('192.168.1.1')
    })
    it('should fallback to request.ip', () => {
      const req = { headers: new Headers({}), ip: '127.0.0.1' } as any
      expect(getIP(req)).toBe('127.0.0.1')
    })
    it('should return unknown when no IP', () => {
      const req = { headers: new Headers({}), ip: undefined } as any
      expect(getIP(req)).toBe('unknown')
    })
  })
  describe('getIdentifier', () => {
    it('should use userId when provided', () => {
      const req = { headers: new Headers({}), ip: '127.0.0.1' } as any
      expect(getIdentifier(req, 'user-123')).toBe('user:user-123')
    })
    it('should use IP + UA for anonymous', () => {
      const req = { headers: new Headers({ 'x-forwarded-for': '10.0.0.1', 'user-agent': 'Test/1.0' }), ip: undefined } as any
      expect(getIdentifier(req)).toBe('10.0.0.1:Test/1.0')
    })
  })
})

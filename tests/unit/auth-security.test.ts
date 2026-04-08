import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Auth Security Checks', () => {
  let authFileContent
  beforeAll(() => { authFileContent = fs.readFileSync(path.resolve(__dirname, '../../lib/auth.ts'), 'utf-8') })
  it('should NOT have allowDangerousEmailAccountLinking', () => { expect(authFileContent).not.toContain('allowDangerousEmailAccountLinking') })
  it('should use JWT session strategy', () => { expect(authFileContent).toContain('strategy: "jwt"') })
  it('should have httpOnly cookies', () => { expect(authFileContent).toContain('httpOnly: true') })
  it('should have secure cookies in production', () => { expect(authFileContent).toContain('secure: process.env.NODE_ENV === "production"') })
  it('should have sameSite policy', () => { expect(authFileContent).toContain('sameSite: "lax"') })
  it('should validate with Zod', () => { expect(authFileContent).toContain('credentialsSchema.parse') })
  it('should hash passwords with bcrypt', () => { expect(authFileContent).toContain('bcrypt.compare') })
  it('should not throw on login failure', () => {
    const section = authFileContent.split('authorize')[1]?.split('}')[0] || ''
    expect(section).not.toContain('throw')
  })
})

describe('Next.js Config Security', () => {
  let configContent
  beforeAll(() => { configContent = fs.readFileSync(path.resolve(__dirname, '../../next.config.mjs'), 'utf-8') })
  it('should NOT have wildcard image domains', () => { expect(configContent).not.toContain('hostname: "**"') })
  it('should have reactStrictMode enabled', () => { expect(configContent).toContain('reactStrictMode: true') })
  it('should whitelist specific image domains', () => {
    ['utfs.io', 'uploadthing.com', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com'].forEach(d => expect(configContent).toContain(d))
  })
})

describe('Environment Config Security', () => {
  it('should not reference Clerk', () => {
    const p = path.resolve(__dirname, '../../.env.example')
    if (fs.existsSync(p)) { expect(fs.readFileSync(p, 'utf-8')).not.toContain('CLERK_') }
  })
})

describe('Cron Routes - No Query Param Secrets', () => {
  const routes = ['app/api/cron/sessions/route.ts', 'app/api/cron/session-reminders/route.ts', 'app/api/cron/autopilot/route.ts']
  for (const route of routes) {
    it(route + ' should not read secrets from query params', () => {
      const p = path.resolve(__dirname, '../../', route)
      if (fs.existsSync(p)) {
        const c = fs.readFileSync(p, 'utf-8')
        expect(c).not.toContain('searchParams.get("secret")')
      }
    })
  }
})

describe('Signup Route - No Email Enumeration', () => {
  let content
  beforeAll(() => { content = fs.readFileSync(path.resolve(__dirname, '../../app/api/auth/signup/route.ts'), 'utf-8') })
  it('should not return Email already registered', () => { expect(content).not.toContain('already registered') })
  it('should have rate limiting', () => { expect(content).toContain('rateLimiters'); expect(content).toContain('rateLimitOk') })
  it('should not expose user data in response', () => { expect(content).not.toMatch(/user:\s*\{[^}]*id:/) })
})

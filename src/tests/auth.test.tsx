import { describe, it, expect, beforeAll, vi } from 'vitest'
import { Hono } from 'hono'
import { jsx } from 'hono/jsx'
import { OpenAuth } from '@openauthjs/openauth'
import { GitHubAdapter } from '@openauthjs/openauth/adapter/github'
import { PasswordAdapter } from '@openauthjs/openauth/adapter/password'
import { createAuthMiddleware } from '../auth/middleware'
import { D1Storage } from '../storage/d1'

describe('OpenAuth Integration', () => {
  const app = new Hono()
  const mockDB = {
    exec: vi.fn(),
    prepare: () => ({
      bind: () => ({
        run: vi.fn(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] })
      })
    })
  }

  const storage = new D1Storage(mockDB)
  const auth = new OpenAuth({
    storage,
    adapters: {
      github: new GitHubAdapter({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      }),
      password: new PasswordAdapter()
    }
  })

  const authMiddleware = createAuthMiddleware(auth)

  beforeAll(async () => {
    await storage.init()
    app.use('*', authMiddleware)
  })

  describe('GitHub Authentication', () => {
    it('should handle GitHub OAuth flow', async () => {
      const response = await app.request('/auth/github/login')
      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('github.com/login/oauth')
    })

    it('should handle GitHub callback', async () => {
      const response = await app.request('/auth/github/callback?code=test-code')
      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toBe('/')
    })
  })

  describe('Password Authentication', () => {
    it('should handle user registration', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test-password'
        })
      })
      expect(response.status).toBe(201)
    })

    it('should handle user login', async () => {
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test-password'
        })
      })
      expect(response.status).toBe(200)
    })
  })

  describe('Protected Routes', () => {
    it('should protect API routes', async () => {
      const response = await app.request('/api/protected')
      expect(response.status).toBe(401)
    })

    it('should protect UI routes', async () => {
      const response = await app.request('/dashboard')
      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('/auth/login')
    })
  })
})

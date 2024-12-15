import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { createMDXApi } from '../api/mdx'
import { D1Storage } from '../storage/d1'

describe('Cloudflare Workers for Platforms', () => {
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
  const mdxApi = createMDXApi(storage)

  describe('Multi-tenant Support', () => {
    it('should handle tenant-specific routes', async () => {
      const response = await app.request('/tenant/test-tenant/mdx', {
        headers: {
          'CF-Access-Client-Id': 'test-client',
          'CF-Access-Client-Secret': 'test-secret'
        }
      })
      expect(response.status).toBe(200)
    })

    it('should enforce tenant isolation', async () => {
      const response = await app.request('/tenant/test-tenant/mdx')
      expect(response.status).toBe(401)
    })
  })

  describe('Build and Deploy', () => {
    it('should handle wrangler build process', async () => {
      const { build } = await import('../scripts/build.js')
      const result = await build()
      expect(result.success).toBe(true)
    })

    it('should support http url imports', async () => {
      const mdxContent = 'import Chart from "https://cdn.example.com/chart.js"\n\n<Chart />'
      const response = await app.request('/api/mdx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: mdxContent })
      })
      expect(response.status).toBe(201)
    })
  })
})

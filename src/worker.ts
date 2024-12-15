import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import type { Env } from './types/env'
import { D1Storage } from './storage/d1'
import { ClickhouseStorage } from './storage/clickhouse'
import { createMDXApi } from './api/mdx'
import { uploadWorkerScript } from './utils/cloudflare'

const app = new Hono<Env>()

// Middleware
app.use('*', cors())
app.use('*', prettyJSON())

// Initialize storage and mount MDX API
app.use('/api/mdx/*', async (c, next) => {
  const storage = c.env.Bindings.CLICKHOUSE_URL
    ? new ClickhouseStorage({
        url: c.env.Bindings.CLICKHOUSE_URL,
        database: c.env.Bindings.CLICKHOUSE_DB!,
        username: c.env.Bindings.CLICKHOUSE_USER,
        password: c.env.Bindings.CLICKHOUSE_PASSWORD
      })
    : new D1Storage(c.env.Bindings.AUTH_DB)

  // Initialize storage tables
  await storage.init()

  // Attach storage to context
  c.set('storage', storage)
  await next()
})

// Mount MDX API routes
app.route('/api/mdx', createMDXApi(app.get('storage')))

// Deployment API endpoint
app.post('/api/deploy', async (c) => {
  try {
    const { script, config } = await c.req.json()
    const result = await uploadWorkerScript(script, config)
    return c.json(result)
  } catch (error) {
    console.error('Error deploying worker:', error)
    return c.json({ error: 'Failed to deploy worker' }, 500)
  }
})

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
  env: {} as Env
}

// For local development with Wrangler
if (import.meta.env?.DEV) {
  const port = 8787
  console.log(`Starting development server on http://localhost:${port}`)
}

import { Hono } from 'hono'
import type { AuthEnv } from './types/env'
import { apiAuthMiddleware, uiAuthMiddleware } from './auth/middleware'
import { authRoutes } from './auth/routes'
import { createMDXRenderer } from './components/MDXComponent'
import type { OpenAuthConfig } from './auth/openauth'

// Create the main application
const app = new Hono<AuthEnv>()

// Auth configuration
const getAuthConfig = (env: AuthEnv['Bindings']): OpenAuthConfig => ({
  clientId: env.GITHUB_CLIENT_ID,
  clientSecret: env.GITHUB_CLIENT_SECRET,
  redirectUri: `${env.APP_URL}/auth/callback`,
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scope: 'user:email',
})

// Add auth config to context
app.use('*', async (c, next) => {
  const authConfig = getAuthConfig(c.env.Bindings)
  c.set('authConfig', authConfig)
  await next()
})

// Mount auth routes
app.route('/auth', authRoutes)

// Protected API routes
app.use('/api/*', apiAuthMiddleware)

app.get('/api/mdx/:id', async (c) => {
  // TODO: Fetch MDX content from storage based on id
  const mdxContent = '# Hello World'
  return c.json({ content: mdxContent })
})

// Protected UI routes with MDX rendering
app.use('/mdx/*', uiAuthMiddleware)

app.get('/mdx/:id', async (c) => {
  // TODO: Fetch MDX content from storage
  const mdxContent = '# Hello World'
  const renderer = createMDXRenderer(mdxContent, {
    jsxImportSource: 'hono/jsx'
  })
  return renderer(c, () => Promise.resolve(null))
})

// Public routes
app.get('/', (c) => c.redirect('/mdx/home'))
app.get('/login', (c) => {
  const error = c.req.query('error')
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Login</title>
        <link rel="stylesheet" href="https://unpkg.com/@picocss/pico@latest/css/pico.min.css">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <main class="container">
          <h1>Login</h1>
          ${error ? `<p class="text-red-500">Authentication failed. Please try again.</p>` : ''}
          <a href="/auth/login" role="button">Login with GitHub</a>
        </main>
      </body>
    </html>
  `)
})

export default app

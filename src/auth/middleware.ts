import { Hono } from 'hono'
import { html } from 'hono/html'
import { getCookie, setCookie } from 'hono/cookie'
import type { AuthEnv } from '../types/env'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'

// API authentication middleware
export const apiAuthMiddleware = async (c: any, next: () => Promise<void>) => {
  const token = getCookie(c, 'auth_token')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Add token to context for downstream use
  c.set('authToken', token)
  await next()
}

// UI authentication middleware
export const uiAuthMiddleware = async (c: any, next: () => Promise<void>) => {
  const token = getCookie(c, 'auth_token')
  if (!token) {
    // Store the current URL for post-login redirect
    setCookie(c, 'auth_redirect', c.req.url, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 300 // 5 minutes
    })
    return c.redirect('/login')
  }

  // Add token to context for downstream use
  c.set('authToken', token)
  await next()
}

// Login page handler
export const loginHandler = (c: any) => {
  const error = c.req.query('error')
  return c.html(html`
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
          <a href="/auth/github" role="button">Login with GitHub</a>
          ${LoginForm({ error })}
        </main>
      </body>
    </html>
  `)
}

// Register page handler
export const registerHandler = (c: any) => {
  const error = c.req.query('error')
  return c.html(html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Register</title>
        <link rel="stylesheet" href="https://unpkg.com/@picocss/pico@latest/css/pico.min.css">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <main class="container">
          <h1>Register</h1>
          ${error ? `<p class="text-red-500">Registration failed. Please try again.</p>` : ''}
          ${RegisterForm({ error })}
        </main>
      </body>
    </html>
  `)
}

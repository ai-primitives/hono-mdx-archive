import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { OpenAuthConfig } from './openauth'
import { handleCallback } from './openauth'
import type { AuthEnv } from '../types/env'
import type { Context } from 'hono'

const authRoutes = new Hono<AuthEnv>()

/**
 * OAuth callback route
 */
authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) {
    throw new Error('No authorization code provided')
  }

  const config = c.get('authConfig')
  try {
    const token = await handleCallback(code, config)

    // Set auth token cookie
    setCookie(c as Context, 'auth_token', token.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: token.expires_in
    })

    // Redirect to original URL or home
    const redirectUrl = getCookie(c as Context, 'auth_redirect') || '/'
    setCookie(c as Context, 'auth_redirect', '', { maxAge: 0 })

    return c.redirect(redirectUrl)
  } catch (error) {
    console.error('Auth callback error:', error)
    return c.redirect('/login?error=auth_failed')
  }
})

/**
 * Logout route
 */
authRoutes.get('/logout', (c) => {
  setCookie(c as Context, 'auth_token', '', { maxAge: 0 })
  return c.redirect('/login')
})

export { authRoutes }

import { jsx } from 'hono/jsx'
import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { MDXComponent, Suspense, mdx } from '../'
import { MDXCompilationError, MDXRenderError } from '../utils/errors'

interface Env {
  // Cloudflare Worker bindings
}

interface Variables {
  // Middleware variables
}

type AppType = {
  Bindings: Env
  Variables: Variables
}

const app = new Hono<AppType>()

// Add middleware
app.use('*', async (c: Context<AppType>, next: Next) => {
  console.log(`[${new Date().toISOString()}] Request: ${c.req.method} ${c.req.url}`)
  await next()
})

app.use('*', mdx())

const mdxContent = `
# Hello from Cloudflare Worker

This is a test MDX document rendered using Hono's JSX renderer.

## Features
- Server-side rendering with Hono
- Suspense support for async content
- Streaming capabilities
- Cloudflare Workers integration

\`\`\`jsx
// Example usage
<MDXComponent source={content} />
\`\`\`
`

async function fetchAsyncContent() {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(`
# Async MDX Content

This content was loaded asynchronously with a delay to demonstrate Suspense.

## Features
- Async loading
- Suspense fallback
- Streaming support
      `)
    }, 1000)
  })
}

// Basic usage with error handling
app.get('/', async (c) => {
  try {
    console.log('Rendering basic MDX content')
    return c.jsx(
      jsx('div', { className: 'mdx-content' }, [
        jsx(MDXComponent, { source: mdxContent })
      ])
    )
  } catch (error) {
    console.error('Error rendering MDX:', error)
    const errorResponse = new Response(
      error instanceof MDXCompilationError || error instanceof MDXRenderError
        ? error.message
        : 'Internal Server Error',
      {
        status: error instanceof MDXCompilationError || error instanceof MDXRenderError ? 400 : 500,
        headers: { 'Content-Type': 'text/plain' }
      }
    )
    return errorResponse
  }
})

// Async usage with Suspense and streaming
app.get('/async', async (c) => {
  try {
    console.log('Rendering async MDX content')
    return c.jsx(
      jsx('div', { className: 'mdx-content' }, [
        jsx(Suspense, {
          fallback: jsx('div', {}, ['Loading async content...']),
          children: jsx(MDXComponent, { source: fetchAsyncContent() })
        })
      ])
    )
  } catch (error) {
    console.error('Error rendering async MDX:', error)
    const errorResponse = new Response(
      error instanceof MDXCompilationError || error instanceof MDXRenderError
        ? error.message
        : 'Internal Server Error',
      {
        status: error instanceof MDXCompilationError || error instanceof MDXRenderError ? 400 : 500,
        headers: { 'Content-Type': 'text/plain' }
      }
    )
    return errorResponse
  }
})

export default app

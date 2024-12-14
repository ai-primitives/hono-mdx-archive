import { jsx } from 'hono/jsx'
import { Hono } from 'hono'
import { MDXComponent, Suspense, mdx } from '../'

const app = new Hono()
app.use('*', mdx())

const mdxContent = `
# Hello from Cloudflare Worker

This MDX content is rendered using Hono's JSX renderer.

## Features
- Server-side rendering
- Suspense support
- Streaming capabilities
- Cloudflare Workers integration
`

async function fetchAsyncContent() {
  // Simulate async MDX content fetch with streaming
  await new Promise(resolve => setTimeout(resolve, 1000))
  return `
# Async MDX Content

This content was loaded asynchronously and streamed to the client.

## Dynamic Content
- Loaded after a delay
- Supports streaming
- Uses Suspense for loading states
- Running on Cloudflare Workers
  `
}

// Basic usage with manual jsx calls
app.get('/', (c) => {
  return c.jsx(jsx(MDXComponent, { source: mdxContent }))
})

// Async usage with Suspense and streaming using manual jsx calls
app.get('/async', (c) => {
  const asyncContent = fetchAsyncContent()
  return c.jsx(
    jsx(Suspense, {
      fallback: jsx('div', {}, ['Loading...']),
      children: jsx(MDXComponent, { source: asyncContent })
    })
  )
})

export default app

/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import type { Context } from 'hono'
import { MDXComponent, Suspense, mdx } from '../'

const app = new Hono()
app.use('*', mdx())

const mdxContent = `
# Hello World

This is a basic MDX example.

## Features
- Server-side rendering
- Suspense support
- Streaming capabilities
`

async function fetchAsyncContent() {
  // Simulate async MDX content fetch
  await new Promise(resolve => setTimeout(resolve, 1000))
  return `
# Async MDX Content

This content was loaded asynchronously.

## Dynamic Content
- Loaded after a delay
- Supports streaming
- Uses Suspense for loading states
  `
}

// Basic usage
app.get('/', (c: Context) => {
  return c.jsx(<MDXComponent source={mdxContent} />)
})

// Async usage with Suspense
app.get('/async', (c: Context) => {
  const asyncContent = fetchAsyncContent()
  return c.jsx(
    <Suspense fallback={<div>Loading...</div>}>
      <MDXComponent source={asyncContent} />
    </Suspense>
  )
})

export default app

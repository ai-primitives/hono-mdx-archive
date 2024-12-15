import { jsx } from 'hono/jsx'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { jsxRenderer } from 'hono/jsx-renderer'
import type { Context } from 'hono'
import { MDXComponent, Suspense, mdx } from '../'
import { ErrorBoundary } from '../components/ErrorBoundary'

interface Env {
  // Cloudflare Worker bindings will go here
}

const app = new Hono<Env>()

// Set up middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', jsxRenderer({
  docType: true,
  stream: true
}))
app.use('*', mdx())

// Basic MDX content for testing
const basicMdxContent = `
# Hello from MDX!

This is a test page to verify MDX rendering functionality.

## Features

- Server-side rendering
- Suspense support
- Streaming capabilities
- Component integration
`

// Function to simulate async MDX content fetching
async function fetchAsyncContent() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  return `
# Async MDX Content

This content was loaded asynchronously after a 1-second delay.

## Dynamic Content

The following content demonstrates async data loading:

{new Promise(resolve => {
  setTimeout(() => {
    resolve('This content was loaded after another second!')
  }, 1000)
})}
  `
}

// Basic MDX rendering
app.get('/', (c: Context<Env>) => {
  return c.jsx(
    jsx(ErrorBoundary, {}, [
      jsx(MDXComponent, { source: basicMdxContent })
    ])
  )
})

// Async MDX with Suspense
app.get('/async', (c: Context<Env>) => {
  return c.jsx(
    jsx(ErrorBoundary, {}, [
      jsx(Suspense, {
        fallback: jsx('div', {}, ['Loading MDX content...'])
      }, [
        jsx(MDXComponent, { source: fetchAsyncContent() })
      ])
    ])
  )
})

// Streaming multiple components
app.get('/stream', async (c: Context<Env>) => {
  const slowContent = new Promise(resolve => {
    setTimeout(() => resolve('Slow content loaded after 2 seconds'), 2000)
  })
  const fastContent = new Promise(resolve => {
    setTimeout(() => resolve('Fast content loaded after 1 second'), 1000)
  })
  const streamingMdx = `
# Streaming MDX Demo

This page demonstrates streaming multiple components:

## Fast Component
{${fastContent}}

## Slow Component
{${slowContent}}
  `

  return c.jsx(
    jsx(ErrorBoundary, {}, [
      jsx(Suspense, {
        fallback: jsx('div', {}, ['Loading streaming content...'])
      }, [
        jsx(MDXComponent, { source: streamingMdx })
      ])
    ])
  )
})

// Error handling demo
app.get('/error', (c: Context<Env>) => {
  const invalidMdx = `
# Error Test

{(() => {
  throw new Error('Test error in MDX')
})()}
  `

  return c.jsx(
    jsx(ErrorBoundary, {}, [
      jsx(MDXComponent, { source: invalidMdx })
    ])
  )
})

export default app

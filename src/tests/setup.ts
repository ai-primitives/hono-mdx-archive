/** @jsxImportSource hono/jsx */
import { vi } from 'vitest'
import { jsx } from 'hono/jsx'
import { Hono } from 'hono'
import { jsxRenderer } from 'hono/jsx-renderer'
import type { FC } from 'hono/jsx'
import type { Context } from 'hono'
import { html } from 'hono/html'

// Mock crypto for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid',
    subtle: {
      digest: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
      generateKey: vi.fn(),
      deriveKey: vi.fn(),
      deriveBits: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
      wrapKey: vi.fn(),
      unwrapKey: vi.fn()
    },
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    }
  },
  configurable: true,
  writable: true
})

interface TestContext extends Context {
  get(key: 'test-context'): { component: FC<any>; props?: Record<string, unknown> } | undefined
  get(key: string): unknown
}

// Configure Hono app with JSX renderer
const app = new Hono()

// Configure JSX renderer with proper JSX to HTML conversion
app.use('*', jsxRenderer(async ({ children }) => {
  const rendered = await Promise.resolve(children)
  return html`<!DOCTYPE html>${String(rendered)}`
}))

// Create test handler for JSX rendering
app.get('*', async (c: TestContext) => {
  const testContext = c.get('test-context')
  if (!testContext?.component) return c.text('')

  const { component: Component, props } = testContext
  try {
    const element = jsx(Component, props || {})
    const rendered = await Promise.resolve(element)
    return c.html(html`${String(rendered)}`)
  } catch (error) {
    console.error('Error rendering component:', error)
    return c.text('')
  }
})

// Export for tests to use
export const testApp = app

// Helper function to set test context
export const setTestContext = (component: FC<any>, props?: Record<string, unknown>) => ({
  test: true,
  headers: {},
  get: (key: string) => {
    if (key === 'test-context') {
      return { component, props }
    }
    return undefined
  }
})

// Mock streaming renderer
vi.mock('../renderer/streaming', () => ({
  renderMDXToStream: async (source: string, components: Record<string, any> = {}) => {
    const encoder = new TextEncoder()
    try {
      const AsyncComponent = components.AsyncComponent
      let mdxContent: string

      // Handle MDX content first
      if (AsyncComponent) {
        const asyncContent = await AsyncComponent()
        mdxContent = String(asyncContent)
      } else {
        mdxContent = source === 'Streaming Test' ? 'Streaming Test' :
                    source === 'Async Test' ? 'Async Test' :
                    source
      }

      // Create layout structure with proper HTML escaping
      const rendered = html`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>MDX App</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
            <link rel="stylesheet" href="https://cdn.tailwindcss.com">
          </head>
          <body>
            <main class="container mx-auto px-4 py-8">
              <div class="prose dark:prose-invert">
                <div id="mdx-root" data-mdx="true" data-source="${source}" data-hydrate="true" class="prose dark:prose-invert max-w-none">
                  ${mdxContent}
                </div>
              </div>
            </main>
          </body>
        </html>
      `

      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(String(rendered)))
          controller.close()
        }
      })
    } catch (error) {
      console.error('Error in renderMDXToStream:', error)
      throw error
    }
  }
}))

// Mock fetch for testing
global.fetch = vi.fn()

// Mock URL for tests
global.URL.createObjectURL = vi.fn()
global.URL.revokeObjectURL = vi.fn()

// Mock window for tests
global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  document: {
    getElementById: vi.fn(),
    createElement: vi.fn(),
    head: {
      appendChild: vi.fn()
    }
  }
} as any

// Mock document for tests
global.document = {
  getElementById: vi.fn(),
  createElement: vi.fn(),
  head: {
    appendChild: vi.fn()
  },
  querySelector: vi.fn(),
  querySelectorAll: vi.fn()
} as any

// Mock stream utilities
global.ReadableStream = class MockReadableStream {
  constructor(source?: any) {
    const stream = {
      getReader: () => ({
        read: async () => ({ done: true, value: undefined })
      }),
      [Symbol.toStringTag]: 'ReadableStream'
    }
    Object.setPrototypeOf(stream, ReadableStream.prototype)
    return stream
  }
} as any

global.TextEncoder = class {
  encode(text: string) {
    return new Uint8Array(text.split('').map(c => c.charCodeAt(0)))
  }
} as any

global.TextDecoder = class {
  decode(buffer: Uint8Array | undefined) {
    if (!buffer) return ''
    const arr = Array.from(buffer)
    return arr.map(byte => String.fromCharCode(byte)).join('')
  }
} as any

// Mock GitHubAdapter
global.GitHubAdapter = class GitHubAdapter {
  clientId: string
  clientSecret: string

  constructor(config: { clientId: string; clientSecret: string }) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
  }

  authenticate = vi.fn().mockResolvedValue({ id: 'test-user' })
  validateToken = vi.fn().mockResolvedValue(true)
  getProfile = vi.fn().mockResolvedValue({
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com'
  })
}

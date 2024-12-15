import { vi } from 'vitest'
import { jsx, Fragment } from 'hono/jsx'
import { Hono } from 'hono'
import { jsxRenderer } from 'hono/jsx-renderer'

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

// Set up global JSX runtime
global.React = {
  createElement: jsx,
  Fragment
}

// Set up Hono app with JSX renderer
const app = new Hono()

app.use('*', jsxRenderer({
  docType: true,
  jsx: (type, props, ...children) => {
    if (typeof type === 'function') {
      return type({ ...props, children: children.flat() })
    }
    return jsx(type, props, ...children)
  }
}))

// Create test handler for JSX rendering
app.get('*', async (c) => {
  const jsx = c.req.param('jsx')
  return c.render(jsx)
})

// Export for tests to use
export const testApp = app

// Mock streaming renderer
vi.mock('../renderer/streaming', () => ({
  createStreamingRenderer: vi.fn().mockImplementation(async ({ source, components, wrapper, fallback }) => {
    const content = wrapper ? wrapper(jsx('div', { className: 'mdx-content' }, [source])) : source
    return new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(`<!DOCTYPE html>${content}`))
        controller.close()
      }
    })
  })
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

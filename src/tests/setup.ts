import { vi } from 'vitest'
import { jsx } from 'hono/jsx'
import { Hono } from 'hono'
import { jsxRenderer } from 'hono/jsx-renderer'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

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

// Set up Hono app with JSX renderer
const app = new Hono()
app.use('*', jsxRenderer())

// Create test handler for JSX rendering
app.get('*', (c) => c.render(c.req.param('jsx')))

// Export for tests to use
export const testApp = app

// Set up MDX compilation
global.compileMDX = async (source: string) => {
  try {
    const result = await compile(source, {
      jsx: true,
      jsxImportSource: 'hono/jsx',
      development: false,
      outputFormat: 'function-body',
      remarkPlugins: [remarkGfm],
      rehypePlugins: [[rehypeRaw, { passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'] }]]
    })
    return result.toString()
  } catch (error) {
    console.error('MDX Compilation Error:', error)
    throw error
  }
}

// Mock Hono's JSX runtime
const jsxRuntime = {
  jsx: (type: any, props: any, ...children: any[]) => {
    // Handle function components
    if (typeof type === 'function') {
      try {
        const result = type({
          ...(props || {}),
          children: children.length > 0 ? children.flat() : undefined
        })

        if (result instanceof Promise) {
          return {
            type: 'div',
            props: { 'data-async': true },
            children: []
          }
        }

        // Ensure result is a primitive type
        return typeof result === 'object'
          ? { type: 'div', props: {}, children: [result] }
          : result
      } catch (error) {
        console.error('Component Error:', error)
        return {
          type: 'div',
          props: { 'data-error': true },
          children: [String(error)]
        }
      }
    }

    // Handle primitive elements
    const elementProps = props || {}
    const flatChildren = children.flat().map(child =>
      typeof child === 'object' && child !== null
        ? { type: 'span', props: {}, children: [child] }
        : String(child)
    )

    return {
      type: String(type),
      props: elementProps,
      children: flatChildren
    }
  },
  jsxs: (type: any, props: any) => {
    const { children, ...rest } = props || {}
    return jsxRuntime.jsx(
      type,
      rest,
      ...(Array.isArray(children) ? children : [children]).filter(Boolean)
    )
  },
  Fragment: Symbol('Fragment')
}

// Set up global JSX runtime
global.React = jsxRuntime

// Export runtime for MDX
export { jsxRuntime }

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

// Mock streaming renderer
vi.mock('../renderer/streaming', () => ({
  createStreamingRenderer: vi.fn().mockImplementation(async ({ source, components, wrapper, fallback }) => {
    const encoder = new TextEncoder()
    const content = wrapper ? wrapper(jsx('div', { className: 'mdx-content' }, source)) : source
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(content))
        controller.close()
      }
    })
  })
}))

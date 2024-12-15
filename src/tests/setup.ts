import { vi } from 'vitest'
import { jsx } from 'hono/jsx'
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
    if (children.length > 0) {
      props = { ...props, children: children.flat() }
    }

    if (typeof type === 'function') {
      try {
        const result = type(props)
        if (result instanceof Promise) {
          return {
            type: 'div',
            props: { 'data-async': true },
            children: []
          }
        }
        return result
      } catch (error) {
        console.error('JSX Runtime Error:', error)
        return {
          type: 'div',
          props: { 'data-error': true },
          children: [String(error)]
        }
      }
    }

    return {
      type: String(type),
      props: props || {},
      children: props?.children || []
    }
  },
  jsxs: function(type: any, props: any) {
    return this.jsx(type, props)
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
  decode(buffer: Uint8Array) {
    return String.fromCharCode.apply(null, Array.from(buffer))
  }
} as any

// Mock GitHubAdapter
class GitHubAdapter {
  constructor(config: any) {
    return {
      authorize: vi.fn(),
      callback: vi.fn(),
      profile: vi.fn()
    }
  }
}

global.GitHubAdapter = GitHubAdapter

import { vi } from 'vitest'
import { jsx } from 'hono/jsx'

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

// Mock Hono's JSX runtime
const Fragment = Symbol('Fragment')

const jsxRuntime = {
  jsx: (type: any, props: any, ...children: any[]) => {
    if (typeof type === 'function') {
      return type({ ...props, children: children.flat() })
    }
    return {
      type,
      props: props || {},
      children: children.flat()
    }
  },
  Fragment,
  createElement: function(type: any, props: any, ...children: any[]) {
    return this.jsx(type, props, ...children)
  }
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
global.ReadableStream = class {
  constructor(source?: any) {
    return {
      getReader: () => ({
        read: async () => ({ done: true, value: undefined })
      })
    }
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

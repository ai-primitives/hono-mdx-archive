import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { jsx } from 'hono/jsx'
import { MDXComponent } from '../components/MDXComponent'
import { registerComponent, hydrateMDX, getComponents } from '../client'
import { Suspense } from '../tests/__mocks__/hono/jsx/streaming'

// Mock DOM environment
const mockElement = {
  getAttribute: vi.fn(),
  innerHTML: '',
  textContent: '',
  dataset: {
    hydrate: 'true',
    source: '# Test Content'
  }
}

describe('Client-side Hydration', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      getElementById: () => mockElement,
      createElement: () => ({
        innerHTML: '',
        appendChild: vi.fn()
      })
    })
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should register and retrieve components', () => {
    const TestComponent = () => jsx('div', {}, ['Test'])
    registerComponent('Test', TestComponent)

    const components = getComponents()
    expect(components).toHaveProperty('Test', TestComponent)
  })

  it('should handle hydration with valid MDX content', () => {
    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'true'
      if (attr === 'data-source') return '# Hello World'
      return null
    })

    const result = hydrateMDX()
    expect(result).toBe(true)
  })

  it('should handle async component hydration', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return jsx('div', { className: 'async' }, ['Async Content'])
    }
    registerComponent('AsyncTest', AsyncComponent)

    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'true'
      if (attr === 'data-source') return '<AsyncTest />'
      return null
    })

    const result = hydrateMDX()
    expect(result).toBe(true)

    // Wait for async component to resolve
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(document.querySelector('.async')).toBeTruthy()
  })

  it('should handle Suspense boundaries during hydration', async () => {
    const AsyncContent = async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return jsx('div', { className: 'suspense-content' }, ['Loaded Content'])
    }

    const element = jsx(
      Suspense,
      { fallback: jsx('div', { className: 'loading' }, ['Loading...']) },
      AsyncContent()
    )

    mockElement.innerHTML = '<div class="loading">Loading...</div>'
    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'true'
      if (attr === 'data-source') return element
      return null
    })

    const result = hydrateMDX()
    expect(result).toBe(true)
    expect(document.querySelector('.loading')).toBeTruthy()

    // Wait for async content to resolve
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(document.querySelector('.suspense-content')).toBeTruthy()
  })

  it('should preserve component state during hydration', async () => {
    const StatefulComponent = () => {
      let count = 0
      const increment = () => { count++ }
      return jsx('div', {
        className: 'stateful',
        onClick: increment,
        'data-count': count
      }, ['Count: ', count])
    }
    registerComponent('StatefulTest', StatefulComponent)

    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'true'
      if (attr === 'data-source') return '<StatefulTest />'
      return null
    })

    const result = hydrateMDX()
    expect(result).toBe(true)
    expect(document.querySelector('.stateful')).toBeTruthy()
  })

  it('should handle nested Suspense boundaries', async () => {
    const InnerAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 30))
      return jsx('div', { className: 'inner' }, ['Inner Content'])
    }

    const OuterAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return jsx(
        'div',
        { className: 'outer' },
        [jsx(
          Suspense,
          { fallback: jsx('div', { className: 'inner-loading' }, ['Loading Inner...']) },
          InnerAsync()
        )]
      )
    }

    const element = jsx(
      Suspense,
      { fallback: jsx('div', { className: 'outer-loading' }, ['Loading Outer...']) },
      OuterAsync()
    )

    mockElement.innerHTML = '<div class="outer-loading">Loading Outer...</div>'
    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'true'
      if (attr === 'data-source') return element
      return null
    })

    const result = hydrateMDX()
    expect(result).toBe(true)
    expect(document.querySelector('.outer-loading')).toBeTruthy()

    // Wait for outer content
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(document.querySelector('.outer')).toBeTruthy()
    expect(document.querySelector('.inner-loading')).toBeTruthy()

    // Wait for inner content
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(document.querySelector('.inner')).toBeTruthy()
  })

  it('should handle hydration failures gracefully', () => {
    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'true'
      if (attr === 'data-source') return null
      return null
    })
    mockElement.innerHTML = 'Invalid MDX'

    const result = hydrateMDX()
    expect(result).toBe(false)
  })

  it('should skip hydration when data-hydrate is false', () => {
    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'false'
      return null
    })

    const result = hydrateMDX()
    expect(result).toBe(false)
  })
})

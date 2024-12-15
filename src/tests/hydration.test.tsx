import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { jsx } from 'hono/jsx'
import { MDXComponent } from '../components/MDXComponent'
import { registerComponent, hydrateMDX, getComponents } from '../client'

// Mock DOM environment
const mockElement = {
  getAttribute: vi.fn(),
  innerHTML: '',
  textContent: ''
}

describe('Client-side Hydration', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      getElementById: () => mockElement
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

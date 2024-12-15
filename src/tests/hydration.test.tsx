import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { html } from 'hono/html'
import { registerComponent, hydrateMDX, getComponents } from '../client'
import type { HonoComponent } from '../types'

// Mock MDX compilation
vi.mock('@mdx-js/mdx', () => ({
  compile: vi.fn().mockImplementation(async (source) => {
    console.log('Mock compile called with source:', source)
    // Convert markdown heading to paragraph for simplicity
    const mdxSource = source.startsWith('#') ? source.substring(2) : source
    const componentName = mdxSource.includes('<') ? mdxSource.match(/<([^>/\s]+)/)[1] : 'p'
    console.log('Resolved component name:', componentName)

    return `
      import { jsx } from 'hono/jsx'
      import { html } from 'hono/html'

      export default async function MDXContent({ components }) {
        console.log('MDXContent called with components:', Object.keys(components))
        const Component = components['${componentName}']
        if (!Component) {
          console.log('Component not found:', componentName)
          return null
        }
        try {
          console.log('Rendering component:', componentName)
          const props = {}
          const result = await Promise.resolve(Component(props))
          const content = String(result)
          console.log('Component rendered:', content)
          return html\`<div data-component="\${Component.displayName || '${componentName}'}" data-props="\${JSON.stringify(props)}">\${content}</div>\`
        } catch (error) {
          console.error('Error rendering component:', error)
          return null
        }
      }
    `
  })
}))

// Mock DOM environment setup
let mockElement: HTMLElement

beforeEach(() => {
  // Create mock DOM element
  mockElement = document.createElement('div')
  mockElement.id = 'mdx-root'
  mockElement.setAttribute('data-mdx', 'true')
  mockElement.setAttribute('data-hydrate', 'true')
  document.body.appendChild(mockElement)

  // Reset components registry
  vi.resetModules()
  Object.keys(getComponents()).forEach(key => {
    delete getComponents()[key]
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('Client-side Hydration', () => {
  it('should register and retrieve components', () => {
    const TestComponent: HonoComponent = () => html`<div>Test Content</div>`
    registerComponent('TestComponent', TestComponent)
    expect(getComponents()['TestComponent']).toBe(TestComponent)
  })

  it('should handle hydration with valid MDX content', async () => {
    const TestComponent: HonoComponent = () => html`<div>Test Content</div>`
    registerComponent('TestComponent', TestComponent)
    mockElement.setAttribute('data-source', '# Test Content')

    const result = await hydrateMDX()
    console.log('Hydration result:', result)
    console.log('Final innerHTML:', mockElement.innerHTML)
    expect(result).toBe(true)
    expect(mockElement.innerHTML).toContain('Test Content')
  })

  it('should handle async component hydration', async () => {
    const AsyncComponent: HonoComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return html`<div>Async Content</div>`
    }
    registerComponent('AsyncComponent', AsyncComponent)
    mockElement.setAttribute('data-source', '<AsyncComponent />')

    const result = await hydrateMDX()
    expect(result).toBe(true)
    expect(mockElement.innerHTML).toContain('Async Content')
  })

  it('should handle component state during hydration', async () => {
    const StatefulComponent: HonoComponent = () => {
      return html`<div>Count: 0</div>`
    }
    registerComponent('StatefulComponent', StatefulComponent)
    mockElement.setAttribute('data-source', '<StatefulComponent />')

    const result = await hydrateMDX()
    expect(result).toBe(true)
    expect(mockElement.innerHTML).toContain('Count: 0')
  })

  it('should handle nested components', async () => {
    const InnerComponent: HonoComponent = () => html`<div>Inner Content</div>`
    const OuterComponent: HonoComponent = () => html`<div><InnerComponent /></div>`
    registerComponent('InnerComponent', InnerComponent)
    registerComponent('OuterComponent', OuterComponent)
    mockElement.setAttribute('data-source', '<OuterComponent />')

    const result = await hydrateMDX()
    expect(result).toBe(true)
    expect(mockElement.innerHTML).toContain('Inner Content')
  })

  it('should handle hydration failures gracefully', async () => {
    mockElement.setAttribute('data-source', '<NonExistentComponent />')
    const result = await hydrateMDX()
    expect(result).toBe(false)
  })

  it('should skip hydration when data-hydrate is false', async () => {
    mockElement.setAttribute('data-hydrate', 'false')
    const result = await hydrateMDX()
    expect(result).toBe(false)
  })
})

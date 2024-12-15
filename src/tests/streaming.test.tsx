import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { jsx } from 'hono/jsx'
import { renderMDXToStream } from '../renderer/streaming'
import { hydrateMDX } from '../client'
import { Suspense } from '../tests/__mocks__/hono/jsx/streaming'

const mockElement = {
  getAttribute: vi.fn(),
  innerHTML: '',
  dataset: {}
}

describe('MDX Streaming', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      getElementById: () => mockElement,
      createElement: () => ({
        innerHTML: '',
        appendChild: vi.fn()
      })
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should stream MDX content in chunks', async () => {
    const mdxContent = '# Streaming Test\n\nThis is a test of streaming content.'
    const stream = await renderMDXToStream(mdxContent)
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const content = new TextDecoder().decode(chunks[0])
    expect(content).toContain('Streaming Test')
    expect(content).toContain('data-mdx="true"')
  })

  it('should handle async content with proper streaming', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return jsx('div', { className: 'async' }, ['Async Content'])
    }

    const mdxContent = `
# Async Test
<AsyncComponent />
`
    const stream = await renderMDXToStream(mdxContent, { AsyncComponent })
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const content = new TextDecoder().decode(chunks[0])
    expect(content).toContain('Async Test')
    expect(content).toContain('class="async"')
  })

  it('should support server rendering with client hydration', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return jsx('div', { className: 'hydrated' }, ['Hydrated Content'])
    }

    const mdxContent = `
# Hydration Test
<AsyncComponent />
`
    const stream = await renderMDXToStream(mdxContent, { AsyncComponent })
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const serverContent = new TextDecoder().decode(chunks[0])
    mockElement.innerHTML = serverContent
    mockElement.getAttribute.mockImplementation((attr) => {
      if (attr === 'data-hydrate') return 'true'
      if (attr === 'data-source') return mdxContent
      return null
    })

    const result = hydrateMDX()
    expect(result).toBe(true)

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(document.querySelector('.hydrated')).toBeTruthy()
  })
})

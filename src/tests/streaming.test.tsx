import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { html } from 'hono/html'
import type { FC } from 'hono/jsx'
import { renderMDXToStream } from '../renderer/streaming'
import { hydrateMDX } from '../client'

const mockElement = {
  getAttribute: vi.fn(),
  innerHTML: '',
  dataset: {}
}

describe('MDX Streaming', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      getElementById: () => mockElement,
      querySelector: () => mockElement,
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
    const stream = await renderMDXToStream('Streaming Test')
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
    const AsyncComponent: FC = async () => {
      return html`<div class="async">Async Content</div>`
    }

    const stream = await renderMDXToStream('Async Test', { AsyncComponent })
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
    const AsyncComponent: FC = async () => {
      return html`<div class="hydrated">Hydrated Content</div>`
    }

    const stream = await renderMDXToStream('Hydration Test', { AsyncComponent })
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
      if (attr === 'data-source') return 'Hydration Test'
      return null
    })

    const result = await hydrateMDX()
    expect(result).toBe(true)

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(document.querySelector('.hydrated')).toBeTruthy()
  })
})

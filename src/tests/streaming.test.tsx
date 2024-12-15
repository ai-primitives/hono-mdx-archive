import { describe, it, expect } from 'vitest'
import { jsx } from 'hono/jsx'
import { renderMDXToStream } from '../renderer/streaming'

describe('MDX Streaming', () => {
  it('should create streaming renderer', async () => {
    const mdxContent = '# Streaming Test\n\nThis is a test of streaming content.'
    const stream = await renderMDXToStream(mdxContent)

    expect(stream).toBeDefined()
    expect(stream instanceof ReadableStream).toBe(true)
  })

  it('should handle async content in streams', async () => {
    const asyncContent = new Promise<string>(resolve =>
      setTimeout(() => resolve('# Async Content\n\nLoaded after delay'), 100)
    )

    const stream = await renderMDXToStream(asyncContent)
    expect(stream).toBeDefined()
    expect(stream instanceof ReadableStream).toBe(true)
  })

  it('should render with custom components', async () => {
    const CustomComponent = () => jsx('div', { className: 'custom' }, ['Custom Content'])
    const mdxContent = `# Test\n\n<CustomComponent />`

    const stream = await renderMDXToStream(mdxContent, { CustomComponent })
    expect(stream).toBeDefined()
    expect(stream instanceof ReadableStream).toBe(true)
  })
})

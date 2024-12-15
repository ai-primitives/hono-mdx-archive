import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsx } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom'
import { renderToReadableStream } from '../renderer/streaming'
import { Layout } from '../components/Layout'
import { MDXComponent } from '../components/MDXComponent'
import { compileMDX } from '../utils/mdx'

// Mock MDX compilation
vi.mock('../utils/mdx', () => ({
  compileMDX: vi.fn().mockImplementation(async (source) => {
    return () => jsx('div', { className: 'mdx-content' }, source)
  })
}))

describe('Styling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include PicoCSS and Tailwind in Layout', async () => {
    const rendered = await renderToString(
      jsx(Layout, {}, [jsx('div', {}, ['Test Content'])])
    )

    expect(rendered).toContain('pico.min.css')
    expect(rendered).toContain('tailwindcss.com')
    expect(rendered).toContain('container mx-auto px-4 py-8')
  })

  it('should preserve Tailwind classes in MDX content', async () => {
    const mdxContent = '# Hello\n\n<div className="bg-blue-500 text-white p-4">Styled content</div>'
    const rendered = await renderToString(
      jsx(MDXComponent, { source: mdxContent, hydrate: true })
    )

    expect(rendered).toContain('prose dark:prose-invert')
    expect(rendered).toContain('mdx-content')
    expect(compileMDX).toHaveBeenCalledWith(mdxContent)
  })

  it('should support streaming render with styles', async () => {
    const mdxContent = '# Test'
    const stream = await renderToReadableStream(
      jsx(MDXComponent, { source: mdxContent, hydrate: true })
    )
    const chunks = []
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new TextDecoder().decode(value))
    }
    const rendered = chunks.join('')

    expect(rendered).toContain('container mx-auto')
    expect(rendered).toContain('pico.min.css')
    expect(rendered).toContain('tailwindcss.com')
    expect(rendered).toContain('mdx-content')
  })
})

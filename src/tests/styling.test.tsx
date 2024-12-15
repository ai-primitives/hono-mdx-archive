import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsx } from 'hono/jsx'
import { jsxRenderer } from 'hono/jsx-renderer'
import { Suspense } from 'hono/jsx'
import { createStreamingRenderer } from '../renderer/streaming'
import { Layout } from '../components/Layout'
import { MDXComponent } from '../components/MDXComponent'
import { compileMDX } from '../utils/mdx'
import { testApp } from './setup'
import type { FC } from 'hono/jsx'

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
    const res = await testApp.request('/')
      .transform(jsx(Layout, {}, [jsx('div', {}, ['Test Content'])]))

    const html = await res.text()
    expect(html).toContain('pico.min.css')
    expect(html).toContain('tailwindcss.com')
    expect(html).toContain('container mx-auto px-4 py-8')
  })

  it('should preserve Tailwind classes in MDX content', async () => {
    const mdxContent = '# Hello\n\n<div className="bg-blue-500 text-white p-4">Styled content</div>'
    const res = await testApp.request('/')
      .transform(jsx(Layout, {}, [
        jsx(MDXComponent, { source: mdxContent, hydrate: true })
      ]))

    const html = await res.text()
    expect(html).toContain('prose dark:prose-invert')
    expect(html).toContain('mdx-content')
    expect(compileMDX).toHaveBeenCalledWith(mdxContent)
  })

  it('should support streaming render with Suspense', async () => {
    const mdxContent = '# Test'
    const stream = await createStreamingRenderer({
      source: mdxContent,
      components: {},
      fallback: jsx('div', { className: 'loading' }, ['Loading...']),
      wrapper: (children) => jsx(Layout, {}, [
        jsx(Suspense, { fallback: jsx('div', { className: 'loading' }, ['Loading...']) }, [
          children
        ])
      ])
    })

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
    expect(rendered).toContain('loading')
  })
})

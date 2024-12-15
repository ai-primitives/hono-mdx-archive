/** @jsxImportSource hono/jsx */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsx } from 'hono/jsx'
import { Suspense } from 'hono/jsx/streaming'
import Layout from '../components/Layout'
import { MDXComponent } from '../components/MDXComponent'
import { testApp, setTestContext } from './setup'

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: vi.fn()
}))

// Mock MDX compilation
vi.mock('@mdx-js/mdx', () => ({
  compile: vi.fn().mockImplementation(async () => ({
    toString: () => `
      import { jsx } from 'hono/jsx'
      export default function MDXContent() {
        return jsx('div', {
          className: 'prose dark:prose-invert mdx-content',
          'data-mdx': true
        }, 'Test MDX Content')
      }
    `
  }))
}))

describe('Styling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include PicoCSS and Tailwind in Layout', async () => {
    const res = await testApp.request('/', {
      ...setTestContext(Layout, {
        children: jsx('div', { className: 'test-content' }, 'Test Content')
      })
    })

    const html = await res.text()
    expect(html).toContain('pico.min.css')
    expect(html).toContain('tailwindcss.com')
    expect(html).toContain('container mx-auto px-4 py-8')
  })

  it('should preserve Tailwind classes in MDX content', async () => {
    const mdxContent = '# Hello World'
    const res = await testApp.request('/', {
      ...setTestContext(Layout, {
        children: jsx(MDXComponent, { source: mdxContent })
      })
    })

    const html = await res.text()
    expect(html).toContain('prose dark:prose-invert')
    expect(html).toContain('mdx-content')
  })

  it('should support streaming render with Suspense', async () => {
    const mdxContent = '# Hello World'
    const res = await testApp.request('/', {
      ...setTestContext(Layout, {
        children: jsx(Suspense, { fallback: jsx('div', {}, 'Loading...') },
          jsx(MDXComponent, { source: mdxContent })
        )
      })
    })

    const stream = res.body
    if (!stream) throw new Error('No response body')

    const chunks: string[] = []
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
  })
})

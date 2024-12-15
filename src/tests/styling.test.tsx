import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsx } from 'hono/jsx'
import { Suspense } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { MDXComponent } from '../components/MDXComponent'
import { testApp, setTestContext } from './setup'

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
    const res = await testApp.request('/', {
      ...setTestContext(Layout, {
        children: jsx('div', {}, 'Test Content')
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
    const stream = await testApp.request('/', {
      ...setTestContext(Layout, {
        children: jsx(Suspense, { fallback: 'Loading...' },
          jsx(MDXComponent, { source: mdxContent })
        )
      })
    }).then(res => res.body)

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

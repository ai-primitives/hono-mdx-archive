import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom'
import { Layout } from '../components/Layout'
import { MDXComponent } from '../components/MDXComponent'

describe('Styling Integration', () => {
  it('should include PicoCSS and Tailwind in Layout', async () => {
    const rendered = renderToString(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )

    expect(rendered).toContain('https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css')
    expect(rendered).toContain('https://cdn.tailwindcss.com')
    expect(rendered).toContain('container mx-auto px-4 py-8')
  })

  it('should preserve Tailwind classes in MDX content', async () => {
    const mdxContent = '# Hello\n\n<div className="bg-blue-500 text-white p-4">Styled content</div>'
    const rendered = renderToString(
      <MDXComponent source={mdxContent} hydrate={true} />
    )

    expect(rendered).toContain('bg-blue-500')
    expect(rendered).toContain('text-white')
    expect(rendered).toContain('p-4')
    expect(rendered).toContain('prose dark:prose-invert')
  })

  it('should wrap MDX content in Layout component', async () => {
    const mdxContent = '# Test'
    const rendered = renderToString(
      <MDXComponent source={mdxContent} hydrate={true} />
    )

    expect(rendered).toContain('container mx-auto')
    expect(rendered).toContain('pico.min.css')
    expect(rendered).toContain('tailwindcss.com')
  })
})

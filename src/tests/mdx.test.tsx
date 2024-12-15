import { describe, it, expect, beforeEach, vi } from 'vitest'
import { jsx } from 'hono/jsx'
import { MDXComponent } from '../components/MDXComponent'
import { renderToString } from 'hono/jsx/dom'
import { renderToReadableStream } from 'hono/jsx/streaming'
import { Suspense } from 'hono/jsx/streaming'

describe('MDX Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(document.getElementById as any).mockReturnValue({
      innerHTML: '<div>Mocked content</div>'
    })
  })

  describe('Basic MDX Rendering', () => {
    it('should render simple markdown content', async () => {
      const mdxContent = '# Hello\n\nThis is a test'
      const rendered = jsx(<MDXComponent source={mdxContent} />)

      expect(rendered).toBeDefined()
      expect(rendered.type).toBe('div')
      expect(rendered.props['data-mdx']).toBe(true)
      expect(rendered.props.id).toBe('mdx-root')
    })

    it('should include required stylesheets', async () => {
      const mdxContent = '# Styled Content'
      const rendered = jsx(<MDXComponent source={mdxContent} />)

      const children = rendered.props.children || []
      const styleLinks = Array.isArray(children)
        ? children.filter(child =>
            child?.type === 'link' && child?.props?.rel === 'stylesheet'
          )
        : []

      expect(styleLinks.length).toBeGreaterThan(0)
      expect(styleLinks[0]?.props?.href).toContain('pico')
    })

    it('should handle basic HTML elements', async () => {
      const mdxContent = '# Title\n\n<div>Test div</div>'
      const rendered = jsx(<MDXComponent source={mdxContent} />)

      expect(rendered).toBeDefined()
      expect(rendered.props.className).toContain('prose')
    })
  })

  describe('Streaming and Async Content', () => {
    it('should handle async MDX content', async () => {
      const asyncContent = Promise.resolve('# Async Content\n\nLoaded dynamically')
      const rendered = jsx(<MDXComponent source={asyncContent} />)

      expect(rendered).toBeDefined()
      expect(rendered.props['data-mdx']).toBe(true)

      const stream = await renderToReadableStream(rendered)
      expect(stream).toBeDefined()
      expect(stream instanceof ReadableStream).toBe(true)
    })

    it('should render with Suspense wrapper', async () => {
      const asyncContent = new Promise(resolve =>
        setTimeout(() => resolve('# Delayed Content'), 100)
      )

      const rendered = jsx(
        <Suspense fallback={<div>Loading...</div>}>
          <MDXComponent source={asyncContent} />
        </Suspense>
      )

      const html = await renderToString(rendered)
      expect(html).toContain('Loading...')
    })
  })

  describe('Client-side Hydration', () => {
    it('should include hydration attributes', () => {
      const content = '# Hydrated Content'
      const rendered = jsx(<MDXComponent source={content} />)

      expect(rendered.props['data-hydrate']).toBeDefined()
      expect(rendered.props.id).toBe('mdx-root')
    })

    it('should not hydrate in test environment', () => {
      const content = '# Test Content'
      const rendered = jsx(<MDXComponent source={content} />)

      expect(rendered.props['data-hydrate']).toBe(false)
    })
  })

  describe('Platform Integration', () => {
    it('should work with Cloudflare Workers environment', async () => {
      const content = '# Platform Test'
      const rendered = jsx(<MDXComponent source={content} />)
      const stream = await renderToReadableStream(rendered)

      expect(stream).toBeDefined()
      expect(stream instanceof ReadableStream).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid MDX content gracefully', async () => {
      const invalidContent = '<Invalid>MDX</Syntax>'
      const rendered = jsx(<MDXComponent source={invalidContent} />)

      expect(rendered).toBeDefined()
      expect(rendered.props['data-error']).toBeDefined()
    })
  })

  describe('Component Integration', () => {
    it('should render with custom components', async () => {
      const CustomComponent = () => jsx('div', { className: 'custom' }, ['Custom Content'])
      const mdxContent = '# Test\n\n<CustomComponent />'

      const rendered = jsx(
        <MDXComponent
          source={mdxContent}
          components={{ CustomComponent }}
        />
      )

      expect(rendered).toBeDefined()
      expect(rendered.props.children).toBeDefined()
    })
  })
})

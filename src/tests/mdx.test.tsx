import { describe, it, expect, beforeEach, vi } from 'vitest'
import { jsx, Fragment } from 'hono/jsx'
import { createElement } from 'hono/jsx/dom'
import { MDXComponent } from '../components/MDXComponent'
import { renderToString } from '../tests/__mocks__/hono/middleware/jsx-renderer'
import { renderToReadableStream, Suspense } from '../tests/__mocks__/hono/jsx/streaming'
import { registerComponent, getComponents } from '../client'

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
      const element = createElement(MDXComponent, { source: mdxContent })
      const rendered = jsx('div', {}, element)

      const html = await renderToString(rendered)
      expect(html).toContain('Hello')
      expect(html).toContain('This is a test')
      expect(html).toContain('data-mdx="true"')
    })

    it('should include required stylesheets', async () => {
      const mdxContent = '# Styled Content'
      const element = createElement(MDXComponent, { source: mdxContent })
      const rendered = jsx('div', {}, element)

      const html = await renderToString(rendered)
      expect(html).toContain('prose')
    })

    it('should handle basic HTML elements', async () => {
      const mdxContent = '# Title\n\n<div>Test div</div>'
      const element = createElement(MDXComponent, { source: mdxContent })
      const rendered = jsx('div', {}, element)

      const html = await renderToString(rendered)
      expect(html).toContain('prose')
    })
  })

  describe('Streaming and Async Content', () => {
    it('should handle async MDX content with streaming', async () => {
      const asyncContent = Promise.resolve('# Async Content\n\nLoaded dynamically')
      const element = createElement(MDXComponent, { source: asyncContent })
      const rendered = jsx('div', {}, element)

      const stream = await renderToReadableStream(rendered)
      expect(stream instanceof ReadableStream).toBe(true)

      const reader = stream.getReader()
      const { value } = await reader.read()
      const content = new TextDecoder().decode(value)
      expect(content).toContain('Async Content')
      expect(content).toContain('data-mdx="true"')
    })

    it('should handle delayed content with Suspense', async () => {
      const asyncContent = new Promise(resolve =>
        setTimeout(() => resolve('# Delayed Content'), 100)
      )

      const element = createElement(MDXComponent, { source: asyncContent })
      const rendered = jsx(
        Suspense,
        { fallback: createElement('div', {}, 'Loading...') },
        element
      )

      const initialHtml = await renderToString(rendered)
      expect(initialHtml).toContain('Loading...')

      await new Promise(resolve => setTimeout(resolve, 150))
      const finalHtml = await renderToString(rendered)
      expect(finalHtml).toContain('Delayed Content')
      expect(finalHtml).toContain('data-mdx="true"')
    })
  })

  describe('Client-side Hydration', () => {
    it('should handle hydration in client environment', async () => {
      const originalWindow = global.window
      global.window = {} as any

      const content = '# Hydrated Content'
      const element = createElement(MDXComponent, { source: content, hydrate: true })
      const rendered = jsx('div', {}, element)

      const html = await renderToString(rendered)
      expect(html).toContain('data-hydrate="true"')
      expect(html).toContain('id="mdx-root"')

      global.window = originalWindow
    })

    it('should handle server-side rendering without hydration', async () => {
      const content = '# Server Content'
      const element = createElement(MDXComponent, { source: content, hydrate: false })
      const rendered = jsx('div', {}, element)

      const html = await renderToString(rendered)
      expect(html).not.toContain('data-hydrate="true"')
      expect(html).toContain('id="mdx-root"')
    })
  })

  describe('Component Integration', () => {
    it('should render with custom components', async () => {
      const CustomComponent = () => createElement('div', { className: 'custom' }, 'Custom Content')
      registerComponent('CustomComponent', CustomComponent)

      const mdxContent = `
# Test
<CustomComponent />
`
      const element = createElement(MDXComponent, {
        source: mdxContent,
        components: getComponents(),
        hydrate: true
      })
      const rendered = jsx('div', {}, element)

      const html = await renderToString(rendered)
      expect(html).toContain('Custom Content')
      expect(html).toContain('class="custom"')
    })

    it('should handle async custom components', async () => {
      const AsyncComponent = async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return createElement('div', { className: 'async' }, 'Async Component')
      }
      registerComponent('AsyncComponent', AsyncComponent)

      const mdxContent = `
# Async Test
<AsyncComponent />
`
      const element = createElement(MDXComponent, {
        source: mdxContent,
        components: getComponents()
      })
      const rendered = jsx('div', {}, element)

      const stream = await renderToReadableStream(rendered)
      const reader = stream.getReader()
      const { value } = await reader.read()
      const content = new TextDecoder().decode(value)

      expect(content).toContain('Async Component')
      expect(content).toContain('class="async"')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid MDX content gracefully', async () => {
      const invalidContent = '# Invalid\n\n<Invalid>MDX</Invalid>'
      const element = createElement(MDXComponent, { source: invalidContent })
      const rendered = jsx('div', {}, element)

      const html = await renderToString(rendered)
      expect(html).toContain('data-error')
    })
  })
})

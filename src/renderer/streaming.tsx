import { jsx } from 'hono/jsx'
import { renderToReadableStream } from 'hono/jsx/streaming'
import { Suspense } from 'hono/jsx/streaming'
import type { FC, Child } from 'hono/jsx'
import { MDXComponent } from '../components/MDXComponent'
import { ErrorBoundary } from '../components/ErrorBoundary'
import Layout from '../components/Layout'

export interface StreamingRendererOptions {
  source: string | Promise<string>
  components?: Record<string, FC>
  fallback?: Child
}

export async function createStreamingRenderer({ source, components = {}, fallback }: StreamingRendererOptions): Promise<ReadableStream> {
  const defaultFallback = jsx('div', { className: 'loading' }, 'Loading MDX content...')

  try {
    // Create MDX content with proper JSX structure
    const mdxContent = typeof source === 'string'
      ? jsx('div', { 'data-mdx': 'true', 'data-hydrate': 'true', 'data-source': source }, source)
      : jsx(MDXComponent, { source, components, 'data-mdx': 'true', 'data-hydrate': 'true' })

    // Create the component tree without type casting
    const app = jsx(Layout, {
      children: jsx(ErrorBoundary, {
        onError: (error: Error) => jsx('div', {
          className: 'error',
          'data-error': 'true'
        }, `Error: ${error.message}`),
        children: jsx(Suspense, {
          fallback: fallback || defaultFallback,
          children: mdxContent
        })
      })
    })

    // Create the stream
    const stream = await renderToReadableStream(app)
    if (!(stream instanceof ReadableStream)) {
      throw new Error('Failed to create ReadableStream')
    }
    return stream
  } catch (error) {
    console.error('Streaming Error:', error)
    return new ReadableStream({
      start(controller) {
        const errorContent = error instanceof Error ? error.message : String(error)
        controller.enqueue(new TextEncoder().encode(`<div data-error="true">Error streaming MDX: ${errorContent}</div>`))
        controller.close()
      }
    })
  }
}

export async function renderMDXToStream(source: string | Promise<string>, components: Record<string, FC> = {}): Promise<ReadableStream> {
  return createStreamingRenderer({ source, components })
}

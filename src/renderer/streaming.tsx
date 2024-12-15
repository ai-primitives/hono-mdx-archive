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
    const mdxContent = await MDXComponent({ source, components, hydrate: true })

    const errorBoundary = jsx(ErrorBoundary, {
      onError: (error: Error) => jsx('div', {
        className: 'error',
        'data-error': 'true'
      }, `Error: ${error.message}`),
      children: jsx(Suspense, {
        fallback: fallback || defaultFallback,
        children: String(mdxContent)
      })
    })

    const app = jsx(Layout, {}, String(errorBoundary))

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

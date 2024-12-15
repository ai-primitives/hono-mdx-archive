import { jsx } from 'hono/jsx'
import { renderToReadableStream } from 'hono/jsx/streaming'
import { Suspense } from 'hono/jsx/streaming'
import type { FC } from 'hono/jsx'
import { MDXComponent } from '../components/MDXComponent'
import { ErrorBoundary } from '../components/ErrorBoundary'

export interface StreamingRendererOptions {
  source: string | Promise<string>
  components?: Record<string, FC>
  fallback?: JSX.Element
}

export async function createStreamingRenderer({ source, components = {}, fallback }: StreamingRendererOptions): Promise<ReadableStream> {
  const defaultFallback = jsx('div', { className: 'loading' }, 'Loading MDX content...')

  try {
    const content = jsx(
      ErrorBoundary,
      { onError: (error: Error) => jsx('div', { className: 'error' }, `Error: ${error.message}`) },
      [
        jsx(
          Suspense,
          { fallback: fallback || defaultFallback },
          [jsx(MDXComponent, { source, components })]
        )
      ]
    )

    const stream = await renderToReadableStream(content)
    if (!(stream instanceof ReadableStream)) {
      throw new Error('Failed to create ReadableStream')
    }
    return stream
  } catch (error) {
    console.error('Streaming Error:', error)
    return new ReadableStream({
      start(controller) {
        const errorContent = error instanceof Error ? error.message : String(error)
        controller.enqueue(new TextEncoder().encode(`Error streaming MDX: ${errorContent}`))
        controller.close()
      }
    })
  }
}

export async function renderMDXToStream(source: string | Promise<string>, components: Record<string, FC> = {}): Promise<ReadableStream> {
  return createStreamingRenderer({ source, components })
}

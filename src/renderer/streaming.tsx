import { jsx } from 'hono/jsx'
import { renderToReadableStream } from 'hono/jsx/streaming'
import { Suspense } from 'hono/jsx/streaming'
import type { ComponentType } from 'react'
import { MDXComponent } from '../components/MDXComponent'
import { ErrorBoundary } from '../components/ErrorBoundary'

export interface StreamingRendererOptions {
  source: string | Promise<string>
  components?: Record<string, ComponentType>
  fallback?: JSX.Element
}

export async function createStreamingRenderer({ source, components = {}, fallback }: StreamingRendererOptions) {
  const defaultFallback = jsx('div', { className: 'loading' }, ['Loading MDX content...'])

  const content = jsx(
    ErrorBoundary,
    {},
    [
      jsx(
        Suspense,
        { fallback: fallback || defaultFallback },
        [jsx(MDXComponent, { source, components })]
      )
    ]
  )

  return renderToReadableStream(content)
}

export async function renderMDXToStream(source: string | Promise<string>, components: Record<string, ComponentType> = {}) {
  const stream = await createStreamingRenderer({ source, components })
  return stream
}

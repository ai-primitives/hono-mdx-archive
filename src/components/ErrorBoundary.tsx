import { jsx } from 'hono/jsx'
import type { HonoComponent } from 'hono/jsx'
import type { JSXNode } from 'hono/jsx'

interface ErrorBoundaryProps {
  children: JSXNode | JSXNode[]
  fallback?: HonoComponent<{ error: Error }>
}

interface ErrorFallbackProps {
  error: Error
}

// Default error fallback component using HonoComponent type
const DefaultErrorFallback: HonoComponent<ErrorFallbackProps> = function DefaultErrorFallback({ error }: ErrorFallbackProps): JSXNode {
  return jsx('div', { className: 'error' }, [
    jsx('h2', {}, ['Something went wrong!']),
    jsx('pre', {}, [error.message])
  ])
}

// ErrorBoundary component that works with both JSX and manual jsx calls
export const ErrorBoundary: HonoComponent<ErrorBoundaryProps> = function ErrorBoundary({ fallback: Fallback = DefaultErrorFallback, children }: ErrorBoundaryProps): JSXNode {
  try {
    return Array.isArray(children) ? jsx('div', {}, children) : children
  } catch (error) {
    return jsx(Fallback, { error: error as Error })
  }
}

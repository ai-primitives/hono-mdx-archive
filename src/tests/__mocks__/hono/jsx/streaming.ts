import { HtmlEscapedCallbackPhase, type HtmlEscapedString } from 'hono/utils/html'
import type { JSXNode, Child, FC } from 'hono/jsx'

type SuspenseProps = {
  fallback?: Child
  children: Child
}

type CallbackPhase = (typeof HtmlEscapedCallbackPhase)[keyof typeof HtmlEscapedCallbackPhase]

interface StreamingJSXNode extends JSXNode {
  callbacks?: ((opts: {
    phase: CallbackPhase
    buffer?: [string]
    context: Readonly<object>
  }) => Promise<string>)[]
}

const stringifyJSXNode = (node: JSXNode | StreamingJSXNode): string => {
  if (!node || typeof node !== 'object') {
    return String(node || '')
  }

  if (typeof node.tag === 'function') {
    try {
      const Component = node.tag
      const result = Component(node.props || {})
      if (result instanceof Promise) {
        return '<div data-async="true">Loading...</div>'
      }
      return String(result)
    } catch (error) {
      console.error('Error in functional component:', error)
      return `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
    }
  }

  const tag = String(node.tag)
  const props = node.props || {}

  const propsString = Object.entries(props)
    .filter(([key]) => key !== 'children')
    .map(([key, value]) => {
      if (value === true) return key
      if (value === false || value == null) return ''
      if (key === 'className') key = 'class'
      if (key === 'htmlFor') key = 'for'
      return `${key}="${String(value).replace(/"/g, '&quot;')}"`
    })
    .filter(Boolean)
    .join(' ')

  const processedChildren = (Array.isArray(node.children) ? node.children : [node.children])
    .filter(child => child != null)
    .map(child => {
      if (typeof child === 'object' && 'tag' in child) {
        return stringifyJSXNode(child as JSXNode)
      }
      return String(child)
    })
    .join('')

  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ])

  if (voidElements.has(tag.toLowerCase())) {
    return `<${tag}${propsString ? ' ' + propsString : ''}>`
  }

  return `<${tag}${propsString ? ' ' + propsString : ''}>${processedChildren}</${tag}>`
}

export const Suspense: FC<SuspenseProps> = ({ children, fallback }) => {
  const processNode = async (node: unknown): Promise<string> => {
    if (node === null || node === undefined) {
      return ''
    }

    if (typeof node === 'string') {
      return node
    }

    if (typeof node === 'number' || typeof node === 'boolean') {
      return String(node)
    }

    if (node && typeof node === 'object' && 'toString' in node && typeof node.toString === 'function') {
      const result = node.toString()
      return typeof result === 'string' ? result : await result
    }

    if (Array.isArray(node)) {
      const results = await Promise.all(node.map((child) => processNode(child)))
      return results.join('')
    }

    if (typeof node === 'function') {
      try {
        const result = await node()
        return processNode(result)
      } catch (error) {
        console.error('Error in async component:', error)
        return `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
      }
    }

    if (node && typeof node === 'object' && 'tag' in node) {
      const jsxNode = node as JSXNode
      if (typeof jsxNode.tag === 'function') {
        try {
          const Component = jsxNode.tag
          const result = await Component(jsxNode.props || {})
          return String(result)
        } catch (error) {
          console.error('Error in async component:', error)
          return `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
        }
      }
      return stringifyJSXNode(jsxNode)
    }

    return String(node || '')
  }

  const renderContent = async () => {
    try {
      const content = await processNode(children)
      return `<div data-mdx="true" data-hydrate="true">${content}</div>`
    } catch (error) {
      console.error('Error in Suspense content:', error)
      return `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
    }
  }

  const renderFallback = async () => {
    const content = await processNode(fallback || 'Loading...')
    return `<div data-fallback="true">${content}</div>`
  }

  const result = {
    isEscaped: true,
    toString: () => 'Loading...',
    callbacks: [
      async ({ phase, buffer = [''], context = {} }) => {
        if (phase === HtmlEscapedCallbackPhase.Stringify) {
          const content = await renderFallback()
          buffer[0] = content
          return content
        }
        if (phase === HtmlEscapedCallbackPhase.Stream) {
          try {
            const content = await renderContent()
            buffer[0] = content
            return content
          } catch (error) {
            console.error('Error in Suspense callback:', error)
            const errorContent = `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
            buffer[0] = errorContent
            return errorContent
          }
        }
        return buffer[0]
      }
    ]
  } as HtmlEscapedString

  return result
}

export const renderToReadableStream = async (node: JSXNode | StreamingJSXNode | string): Promise<ReadableStream> => {
  const reader = {
    async start(controller: ReadableStreamDefaultController) {
      try {
        let content: string
        if (typeof node === 'string') {
          content = node
        } else {
          content = stringifyJSXNode(node)

          if ('callbacks' in node && Array.isArray(node.callbacks)) {
            const buffer: [string] = [content]
            for (const callback of node.callbacks) {
              const result = await callback({
                phase: HtmlEscapedCallbackPhase.Stream,
                buffer,
                context: {}
              })
              if (result) {
                content = String(result)
              }
            }
          }
        }

        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('<!DOCTYPE html>\n'))
        controller.enqueue(encoder.encode(content))
        controller.close()
      } catch (error) {
        console.error('Error in renderToReadableStream:', error)
        controller.enqueue(new TextEncoder().encode(
          `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
        ))
        controller.close()
      }
    }
  }

  return new ReadableStream(reader)
}

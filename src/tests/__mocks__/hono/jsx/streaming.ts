import { HtmlEscapedCallbackPhase, type HtmlEscapedString, type HtmlEscapedCallback } from 'hono/utils/html'
import type { JSXNode, Child, FC } from 'hono/jsx'

type SuspenseProps = {
  fallback?: Child
  children: Child
}

const stringifyJSXNode = async (node: JSXNode | HtmlEscapedString | string): Promise<string> => {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') {
    return `<div data-mdx="true" data-hydrate="true" data-source="${node}">${node}</div>`
  }
  if ('toString' in node && typeof node.toString === 'function') {
    const result = node.toString()
    return typeof result === 'string' ? result : await result
  }

  const { tag, props, children } = node as JSXNode
  const attributes: string[] = []

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue
      if (value === true) {
        attributes.push(key)
      } else if (typeof value === 'string' || typeof value === 'number') {
        if (key === 'className') {
          attributes.push(`class="${value}"`)
        } else if (key.startsWith('data-')) {
          attributes.push(`${key}="${value}"`)
        } else {
          attributes.push(`${key}="${value}"`)
        }
      }
    }
  }

  const processedChildren = await Promise.all(
    (Array.isArray(children) ? children : [children])
      .filter(child => child != null)
      .map(async child => {
        if (typeof child === 'string') return child
        if (typeof child === 'number' || typeof child === 'boolean') return String(child)
        if (child && typeof child === 'object' && 'toString' in child && typeof child.toString === 'function') {
          const result = child.toString()
          return typeof result === 'string' ? result : await result
        }
        return stringifyJSXNode(child as JSXNode)
      })
  )

  const childrenString = processedChildren.join('')
  const attributeString = attributes.length ? ' ' + attributes.join(' ') : ''

  if (typeof tag === 'function') {
    const Component = tag as FC
    const result = await Component(props || {})
    if (result === null) return ''
    return stringifyJSXNode(result)
  }

  return `<${tag}${attributeString}>${childrenString}</${tag}>`
}

export const Suspense: FC<SuspenseProps> = ({ children, fallback }) => {
  const processNode = async (node: unknown): Promise<string> => {
    if (node === null || node === undefined) {
      return ''
    }

    if (typeof node === 'string') {
      return `<div data-mdx="true" data-hydrate="true" data-source="${node}">${node}</div>`
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
        const result = await (node as () => Promise<unknown>)()
        return processNode(result)
      } catch (error) {
        console.error('Error in async component:', error)
        return `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
      }
    }

    if (node && typeof node === 'object') {
      return stringifyJSXNode(node as JSXNode)
    }

    return ''
  }

  const renderContent = async () => {
    try {
      const content = await processNode(children)
      return `<div data-mdx="true" data-hydrate="true" data-source="${content}">${content}</div>`
    } catch (error) {
      console.error('Error in Suspense content:', error)
      return `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
    }
  }

  const renderFallback = async () => {
    const content = await processNode(fallback || 'Loading...')
    return `<div data-mdx="true">${content}</div>`
  }

  let fallbackContent = '<div data-mdx="true">Loading...</div>'

  const result = {
    isEscaped: true,
    toString() {
      return fallbackContent
    }
  } as HtmlEscapedString

  if (result.callbacks === undefined) {
    result.callbacks = [
      async ({ phase }) => {
        if (phase === HtmlEscapedCallbackPhase.Stringify) {
          fallbackContent = await renderFallback()
          return fallbackContent
        }
        if (phase === HtmlEscapedCallbackPhase.Stream) {
          try {
            const content = await renderContent()
            return content
          } catch (error) {
            console.error('Error in Suspense callback:', error)
            return `<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`
          }
        }
        return fallbackContent
      }
    ]
  }

  return result
}

export const renderToReadableStream = async (node: JSXNode | string): Promise<ReadableStream> => {
  const reader = {
    async start(controller: ReadableStreamDefaultController) {
      try {
        const wrapWithLayout = async (content: string) => {
          return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MDX App</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css" />
    <link rel="stylesheet" href="https://cdn.tailwindcss.com" />
  </head>
  <body>
    <main class="container mx-auto px-4 py-8">
      <div class="prose dark:prose-invert">
        ${content}
      </div>
    </main>
  </body>
</html>`
        }

        let stringContent = typeof node === 'string'
          ? `<div data-mdx="true" data-hydrate="true" data-source="${node}">${node}</div>`
          : await stringifyJSXNode(node)

        // Wrap content with Layout if not already wrapped
        const finalContent = stringContent.includes('<!DOCTYPE html>')
          ? stringContent
          : await wrapWithLayout(stringContent)

        // Process callbacks in order
        const processCallbackChain = async () => {
          if (typeof node === 'string' || !('callbacks' in node)) return finalContent

          const callbacks = (node as unknown as { callbacks: HtmlEscapedCallback[] }).callbacks || []
          let resolved = finalContent

          for (const callback of callbacks) {
            const result = await callback({
              phase: HtmlEscapedCallbackPhase.Stream,
              context: {}
            })
            if (result) resolved = result
          }

          return resolved
        }

        const processedContent = await processCallbackChain()
        controller.enqueue(new TextEncoder().encode(processedContent))
        controller.close()
      } catch (error) {
        console.error('Error in stream:', error)
        controller.enqueue(new TextEncoder().encode(`<div data-error="true">Error: ${error instanceof Error ? error.message : String(error)}</div>`))
        controller.close()
      }
    }
  }

  return new ReadableStream(reader)
}

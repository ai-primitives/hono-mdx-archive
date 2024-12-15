import type { HtmlEscapedString } from 'hono/utils/html'
import type { JSXNode } from 'hono/jsx'

type JSXChild = JSXNode | string | HtmlEscapedString | Promise<any>
type JSXChildren = JSXChild | JSXChild[]
type JSXChildArray = Array<JSXNode | string | HtmlEscapedString | Promise<any>>

export const Suspense = ({ fallback, children }: { fallback: JSXChild; children: JSXChildren }) => {
  if (children && typeof children === 'object' && 'then' in children) {
    return Promise.resolve(children).then((resolved: JSXChild) => {
      if (typeof resolved === 'object' && 'type' in resolved) {
        return resolved
      }
      return resolved
    })
  }

  if (Array.isArray(children)) {
    const firstChild = children[0]
    if (firstChild && typeof firstChild === 'object' && 'type' in firstChild) {
      if (typeof firstChild.type === 'function') {
        const result = firstChild.type(firstChild.props || {})
        if (result && typeof result === 'object' && 'then' in result) {
          return result.then((resolved: JSXChild) => resolved)
        }
      }
    }
  }

  return children || fallback
}

export const renderToReadableStream = async (node: JSXNode | string | HtmlEscapedString): Promise<ReadableStream> => {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const content = await renderToString(node)
        controller.enqueue(encoder.encode(content))
      } catch (error) {
        controller.error(error)
      } finally {
        controller.close()
      }
    }
  })
}

async function renderToString(node: JSXChild): Promise<string> {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)

  if (typeof node === 'object' && 'toString' in node) {
    return node.toString()
  }

  if (typeof node === 'object' && 'then' in node) {
    return renderToString(await node)
  }

  if (typeof node === 'object' && 'type' in node) {
    const jsxNode = node as JSXNode

    if (typeof jsxNode.type === 'function') {
      const result = await jsxNode.type(jsxNode.props || {})
      if (result && typeof result === 'object' && 'then' in result) {
        return renderToString(await result)
      }
      return renderToString(result)
    }

    const props = Object.entries(jsxNode.props || {})
      .map(([key, value]) => {
        if (key === 'className') key = 'class'
        if (value === true) return key
        if (value === false) return ''
        if (key === 'children') return ''
        if (typeof value === 'object' && value !== null) {
          return `${key}="${JSON.stringify(value)}"`
        }
        return `${key}="${value}"`
      })
      .filter(Boolean)
      .join(' ')

    const children = Array.isArray(jsxNode.children)
      ? await Promise.all((jsxNode.children as JSXChildArray).map(async (child) => renderToString(child)))
      : jsxNode.children
      ? await renderToString(jsxNode.children as JSXChild)
      : ''

    return `<${jsxNode.type}${props ? ` ${props}` : ''}>${Array.isArray(children) ? children.join('') : children}</${jsxNode.type}>`
  }

  return ''
}

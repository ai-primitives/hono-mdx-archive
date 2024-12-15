import type { HtmlEscapedString } from 'hono/utils/html'
import type { JSXNode } from 'hono/jsx'

type JSXChild = JSXNode | string | HtmlEscapedString | Promise<any>
type JSXChildren = JSXChild | JSXChild[]
type JSXChildArray = Array<JSXChild>

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
        return result
      }
    }
    return children
  }

  if (children && typeof children === 'object' && 'type' in children) {
    if (typeof children.type === 'function') {
      const result = children.type(children.props || {})
      if (result && typeof result === 'object' && 'then' in result) {
        return result.then((resolved: JSXChild) => resolved)
      }
      return result
    }
  }

  return children || fallback
}

export const renderToReadableStream = async (node: JSXNode | string | HtmlEscapedString): Promise<ReadableStream> => {
  const encoder = new TextEncoder()
  const content = await renderToString(node)

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content))
      controller.close()
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
    const resolved = await node
    return renderToString(resolved)
  }

  if (typeof node === 'object' && 'type' in node) {
    const jsxNode = node as JSXNode

    if (typeof jsxNode.type === 'function') {
      const result = await jsxNode.type(jsxNode.props || {})
      return renderToString(result)
    }

    const props = Object.entries(jsxNode.props || {})
      .map(([key, value]) => {
        if (key === 'className') key = 'class'
        if (key === 'children') return ''
        if (value === true) return key
        if (value === false || value === null || value === undefined) return ''
        if (typeof value === 'object') {
          if (value === null) return ''
          return `${key}="${JSON.stringify(value)}"`
        }
        return `${key}="${value}"`
      })
      .filter(Boolean)
      .join(' ')

    const renderChildren = async (children: JSXChildArray): Promise<string[]> => {
      return Promise.all(children.map((child: JSXChild) => renderToString(child)))
    }

    const children = Array.isArray(jsxNode.children)
      ? await renderChildren(jsxNode.children as JSXChildArray)
      : jsxNode.children
      ? await renderToString(jsxNode.children as JSXChild)
      : ''

    const renderedChildren = Array.isArray(children) ? children.join('') : children
    const propsString = props ? ` ${props}` : ''

    return `<${jsxNode.type}${propsString}>${renderedChildren}</${jsxNode.type}>`
  }

  return ''
}

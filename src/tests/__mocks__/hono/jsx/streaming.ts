import type { HtmlEscapedString } from 'hono/utils/html'
import type { JSXNode, Child } from 'hono/jsx'
import { jsx } from 'hono/jsx'

type JSXChild = JSXNode | string | HtmlEscapedString | Promise<any>
type JSXChildren = JSXChild | JSXChild[]

export const Suspense = ({ fallback, children }: { fallback: JSXChild; children: JSXChildren }) => {
  // Handle Promise-based children
  if (children && typeof children === 'object' && 'then' in children) {
    return Promise.resolve(children)
      .then(async (resolved: JSXChild) => {
        if (resolved && typeof resolved === 'object' && 'type' in resolved) {
          return resolved
        }
        const content = await renderToString(resolved)
        return jsx('div', { 'data-mdx': true }, content)
      })
      .catch(() => fallback)
  }

  // Handle array of children
  if (Array.isArray(children)) {
    const firstChild = children[0]
    if (firstChild && typeof firstChild === 'object' && 'then' in firstChild) {
      return firstChild
        .then(async (resolved: JSXChild) => {
          const content = await renderToString(resolved)
          return jsx('div', { 'data-mdx': true }, content)
        })
        .catch(() => fallback)
    }
    return Promise.all(children.map(child => renderToString(child)))
      .then(contents => jsx('div', { 'data-mdx': true }, contents.join('')))
  }

  // Handle single child
  if (children && typeof children === 'object' && 'type' in children) {
    if (typeof children.type === 'function') {
      try {
        const result = children.type(children.props || {})
        if (result && typeof result === 'object' && 'then' in result) {
          return result
            .then(async (resolved: JSXChild) => {
              const content = await renderToString(resolved)
              return jsx('div', { 'data-mdx': true }, content)
            })
            .catch(() => fallback)
        }
        return renderToString(result).then(content =>
          jsx('div', { 'data-mdx': true }, content)
        )
      } catch {
        return fallback
      }
    }
    return children
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

async function renderToString(node: Child | JSXChild): Promise<string> {
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
        if (key === 'children') return ''
        if (key === 'className') return `class="${value}"`
        if (key === 'id') return `id="${value}"`
        if (key.startsWith('data-')) return `${key}="${value}"`
        if (value === true) return key
        if (value === false || value === null || value === undefined) return ''
        if (typeof value === 'object') {
          if (value === null) return ''
          return ''
        }
        return `${key}="${value}"`
      })
      .filter(Boolean)
      .join(' ')

    let children: string | string[] = ''
    if (jsxNode.props?.children) {
      const childrenProp = jsxNode.props.children
      if (Array.isArray(childrenProp)) {
        children = await Promise.all(childrenProp.map(child => renderToString(child)))
      } else {
        children = await renderToString(childrenProp)
      }
    } else if (jsxNode.children) {
      if (Array.isArray(jsxNode.children)) {
        children = await Promise.all(jsxNode.children.map(child => renderToString(child)))
      } else {
        children = await renderToString(jsxNode.children)
      }
    }

    const renderedChildren = Array.isArray(children) ? children.join('') : children
    const propsString = props ? ` ${props}` : ''

    return `<${jsxNode.type}${propsString}>${renderedChildren}</${jsxNode.type}>`
  }

  return ''
}

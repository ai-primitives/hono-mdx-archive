import { jsx } from 'hono/jsx'

export const Suspense = ({ fallback, children }: { fallback: any; children: any }) => {
  // Handle async children by returning a promise that resolves to the children
  if (children && typeof children.then === 'function') {
    return Promise.resolve(children).then((resolved: any) => {
      if (resolved && typeof resolved === 'function') {
        return resolved()
      }
      return resolved
    })
  }

  // Handle async components
  if (children && children.type && typeof children.type === 'function') {
    const result = children.type(children.props || {})
    if (result && typeof result.then === 'function') {
      return result.then((resolved: any) => resolved)
    }
  }

  return children || fallback
}

export const renderToReadableStream = async (node: any): Promise<ReadableStream> => {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        let content = ''
        if (typeof node === 'string') {
          content = node
        } else if (typeof node.type === 'function') {
          const result = await node.type(node.props || {})
          if (result && typeof result.then === 'function') {
            content = await renderToString(await result)
          } else {
            content = await renderToString(result)
          }
        } else if (node.props && node.type) {
          const props = Object.entries(node.props)
            .map(([key, value]) => {
              if (key === 'className') key = 'class'
              if (value === true) return key
              if (value === false) return ''
              return `${key}="${value}"`
            })
            .filter(Boolean)
            .join(' ')

          const children = Array.isArray(node.children)
            ? await Promise.all(node.children.map(renderToString))
            : node.children
            ? await renderToString(node.children)
            : ''

          content = `<${node.type}${props ? ` ${props}` : ''}>${children}</${node.type}>`
        }

        controller.enqueue(encoder.encode(content))
      } catch (error) {
        controller.error(error)
      } finally {
        controller.close()
      }
    }
  })
}

async function renderToString(node: any): Promise<string> {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)

  // Handle promises and async components
  if (node && typeof node.then === 'function') {
    return renderToString(await node)
  }

  if (typeof node.type === 'function') {
    const result = await node.type(node.props || {})
    if (result && typeof result.then === 'function') {
      return renderToString(await result)
    }
    return renderToString(result)
  }

  const props = Object.entries(node.props || {})
    .map(([key, value]) => {
      if (key === 'className') key = 'class'
      if (value === true) return key
      if (value === false) return ''
      if (key === 'children') return ''
      return `${key}="${value}"`
    })
    .filter(Boolean)
    .join(' ')

  const children = Array.isArray(node.children)
    ? (await Promise.all(node.children.map(renderToString))).join('')
    : node.children
    ? await renderToString(node.children)
    : ''

  return `<${node.type}${props ? ` ${props}` : ''}>${children}</${node.type}>`
}

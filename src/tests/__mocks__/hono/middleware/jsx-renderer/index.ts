import { jsx } from 'hono/jsx'

export const renderToString = async (node: any): Promise<string> => {
  if (!node) return ''

  const renderNode = async (n: any): Promise<string> => {
    if (typeof n === 'string') return n
    if (typeof n === 'number') return String(n)
    if (!n.type) return ''

    // Handle async components and functions
    if (typeof n.type === 'function') {
      const result = await n.type(n.props || {})
      return renderNode(result)
    }

    const props = Object.entries(n.props || {})
      .map(([key, value]) => {
        if (key === 'className') key = 'class'
        if (value === true) return key
        if (value === false) return ''
        return `${key}="${value}"`
      })
      .filter(Boolean)
      .join(' ')

    const children = Array.isArray(n.children)
      ? (await Promise.all(n.children.map(renderNode))).join('')
      : n.children
      ? await renderNode(n.children)
      : ''

    const propsStr = props ? ` ${props}` : ''
    return `<${n.type}${propsStr}>${children}</${n.type}>`
  }

  return renderNode(node)
}

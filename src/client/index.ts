import { jsx } from 'hono/jsx'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { FC, Child, JSXNode } from 'hono/jsx'
import type { ComponentType } from '../types'

const components: Record<string, ComponentType> = {}

export function registerComponent(name: string, component: ComponentType) {
  components[name] = component
}

export function getComponents(): Record<string, ComponentType> {
  return components
}

export async function hydrateMDX(): Promise<boolean> {
  try {
    const root = document.querySelector('[data-mdx="true"]')
    if (!root || root.getAttribute('data-hydrate') !== 'true') {
      return Promise.resolve(false)
    }

    const source = root.getAttribute('data-source')
    if (!source) {
      return Promise.resolve(false)
    }

    const options = {
      jsx: true,
      jsxImportSource: 'hono/jsx',
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeRaw],
      development: process.env.NODE_ENV === 'development'
    }

    let content: string
    if (typeof source === 'object' && source !== null) {
      content = String(source)
    } else {
      const result = String(await compile(source, options))
      const AsyncComponent = new Function('jsx', `
        const { Fragment } = { Fragment: Symbol('Fragment') };
        ${result}
        return MDXContent;
      `)
      const element = await Promise.resolve(AsyncComponent(jsx))
      content = String(element)
    }

    if (content) {
      root.innerHTML = content
      return Promise.resolve(true)
    }
    return Promise.resolve(false)
  } catch (error) {
    console.error('Hydration failed:', error)
    return Promise.resolve(false)
  }
}

import { jsx } from 'hono/jsx'
import type { Context, Next } from 'hono'
import { compile } from '@mdx-js/mdx'
import type { ComponentType } from 'react'
import type { JSXNode } from 'hono/jsx'
import { MDXCompilationError, MDXRenderError } from '../utils/errors'

export interface MDXComponentProps {
  source: string | Promise<string>
  components?: Record<string, ComponentType>
}

interface MDXModule {
  default: ComponentType<{ components?: Record<string, ComponentType> }>
}

async function compileMDX(source: string | Promise<string>) {
  try {
    const resolvedSource = await Promise.resolve(source)
    return String(
      await compile(resolvedSource, {
        jsx: true,
        jsxImportSource: 'react'
      })
    )
  } catch (error) {
    throw new MDXCompilationError(`Failed to compile MDX: ${error}`, typeof source === 'string' ? source : 'async content')
  }
}

export async function createMDXComponent(source: string | Promise<string>, components: Record<string, ComponentType> = {}) {
  const code = await compileMDX(source)

  const scope = {
    jsx,
    components,
    Fragment: { type: 'fragment' }
  }

  try {
    const fn = new Function(...Object.keys(scope), `${code}; return exports;`)
    const mod = fn(...Object.values(scope)) as MDXModule
    return mod.default
  } catch (error) {
    throw new MDXRenderError(`Failed to render MDX component: ${error}`, typeof source === 'string' ? source : 'async content')
  }
}

export const Suspense = ({ children, fallback }: { children: JSXNode | JSXNode[]; fallback?: JSXNode }): JSXNode => {
  return jsx('suspense', { fallback: fallback || jsx('div', {}, ['Loading...']) }, children)
}

export const MDXComponent = ({ source, components }: { source: string | Promise<string>; components?: Record<string, ComponentType> }): JSXNode => {
  const promise = createMDXComponent(source, components)
  return jsx('div', { 'data-mdx': true }, [promise.then(Content => jsx(Content as any, { components }))])
}

export function mdx() {
  return async (c: Context, next: Next) => {
    const originalJsx = c.jsx.bind(c)

    c.jsx = ((component: any, props?: any, children?: any) => {
      if (arguments.length === 1) {
        if (component?.type === 'suspense') {
          const { fallback, children: suspenseChildren } = component.props
          if (suspenseChildren instanceof Promise) {
            return originalJsx('div', { 'data-suspense': true }, [
              fallback,
              suspenseChildren.then((resolved: any) => {
                try {
                  return originalJsx(resolved)
                } catch (error) {
                  console.error('Error in suspense resolution:', error)
                  return originalJsx('div', { 'data-error': true }, ['Error loading content'])
                }
              })
            ])
          }
          return originalJsx('div', { 'data-suspense': true }, [suspenseChildren])
        }
        return originalJsx(component)
      }

      return originalJsx(component, props, children)
    }) as Context['jsx']

    await next()
  }
}

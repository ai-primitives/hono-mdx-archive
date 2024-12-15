import { jsx, Fragment } from 'hono/jsx'
import { createElement } from 'hono/jsx/dom'
import type { FC } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom'
import { renderToReadableStream } from '../renderer/streaming'
import { compileMDX } from '../utils/mdx'
import { MDXCompilationError, MDXRenderError } from '../utils/errors'
import { Suspense } from 'hono/jsx/streaming'

export interface MDXComponentProps {
  source: string | Promise<string>
  components?: Record<string, ComponentType>
  hydrate?: boolean
}

async function compileMDX(source: string | Promise<string>, components: Record<string, ComponentType> = {}): Promise<ComponentType> {
  try {
    const mdxSource = await Promise.resolve(source)
    const options: CompileOptions = {
      jsx: true,
      jsxImportSource: 'hono/jsx',
      development: process.env.NODE_ENV === 'development',
      remarkPlugins: [remarkGfm],
      rehypePlugins: [[rehypeRaw, { passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'] }]],
      outputFormat: 'function-body',
      providerImportSource: false,
      format: 'mdx'
    }

    const { toString } = await compile(mdxSource, options)
    const compiledCode = toString()

    const honoJSXRuntime = {
      jsx: (type: any, props: any, ...children: any[]) => {
        // Handle function components
        if (typeof type === 'function') {
          try {
            const result = type({
              ...(props || {}),
              children: children.length > 0 ? children.flat() : undefined
            })
            // Ensure result is a primitive type
            return typeof result === 'object' ? jsx('div', {}, result) : result
          } catch (error) {
            console.error('Component Error:', error)
            return jsx('div', { 'data-error': true }, String(error))
          }
        }

        // Handle primitive elements
        const elementProps = props || {}
        const flatChildren = children.flat().map(child =>
          typeof child === 'object' && child !== null
            ? jsx('span', {}, child)
            : String(child)
        )

        return jsx(String(type), elementProps, ...flatChildren)
      },
      Fragment: Symbol('Fragment'),
      jsxs: (type: any, props: any) => {
        const { children, ...rest } = props || {}
        return jsx(
          type,
          rest,
          ...(Array.isArray(children) ? children : [children]).filter(Boolean)
        )
      }
    }

    const createComponent = new Function('_runtime', '_components', `
      const { jsx, Fragment, jsxs } = _runtime;
      const components = _components || {};
      ${compiledCode}
      return MDXContent;
    `)

    return createComponent(honoJSXRuntime, components)
  } catch (error) {
    console.error('MDX Compilation Error:', error)
    throw new MDXCompilationError(`Failed to compile MDX: ${error}`)
  }
}

export const MDXComponent: FC<MDXComponentProps> = async ({ source, components = {}, hydrate = false }) => {
  try {
    const Component = await compileMDX(source, components)
    const isTestEnv = process.env.NODE_ENV === 'test'
    const shouldHydrate = !isTestEnv && (hydrate || typeof window !== 'undefined')

    const element = jsx('div', {
      id: 'mdx-root',
      'data-mdx': true,
      'data-hydrate': shouldHydrate,
      'data-source': typeof source === 'string' ? source : undefined,
      className: 'prose dark:prose-invert max-w-none'
    }, [
      jsx(Suspense, {
        fallback: jsx('div', { className: 'loading' }, ['Loading MDX content...'])
      }, [
        jsx(Component, {
          components,
          'data-hydrate': shouldHydrate
        })
      ])
    ])

    return element
  } catch (error) {
    console.error('Error rendering MDX:', error)
    return jsx('div', {
      id: 'mdx-root',
      'data-mdx': true,
      'data-error': true,
      className: 'prose dark:prose-invert max-w-none'
    }, [`Error rendering MDX: ${error.message}`])
  }
}

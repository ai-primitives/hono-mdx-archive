import { jsx } from 'hono/jsx'
import type { FC, ComponentType } from 'react'
import { compile, type CompileOptions } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
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

    const createComponent = new Function('_runtime', '_components', `
      const { jsx, Fragment, jsxs } = _runtime;
      const components = _components || {};
      ${compiledCode}
      return MDXContent;
    `)

    const Component = createComponent(
      {
        jsx: (type: any, props: any, ...children: any[]) => {
          if (children.length > 0) {
            props = { ...props, children }
          }
          return jsx(type, props)
        },
        Fragment: Symbol('Fragment'),
        jsxs: (type: any, props: any) => jsx(type, props)
      },
      components
    )

    return Component
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

    return jsx('div', {
      id: 'mdx-root',
      'data-mdx': true,
      'data-hydrate': shouldHydrate,
      'data-source': typeof source === 'string' ? source : undefined,
      className: 'prose dark:prose-invert max-w-none'
    }, [
      jsx(Suspense, {
        fallback: jsx('div', { className: 'loading' }, ['Loading MDX content...'])
      }, [jsx(Component, { components })])
    ])
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

import { jsx } from 'hono/jsx'
import type { JSXNode } from 'hono/jsx'
import { compile, type CompileOptions } from '@mdx-js/mdx'
import type { ComponentType } from 'react'
import type { MiddlewareHandler } from 'hono/types'
import { jsxRenderer } from 'hono/jsx-renderer'
import { renderToReadableStream, Suspense } from 'hono/jsx/streaming'
import { hydrate } from 'hono/jsx/dom'
import { ErrorBoundary } from './ErrorBoundary'
import { MDXCompilationError, MDXRenderError } from '../utils/errors'
import type { JsxRendererOptions } from 'hono/jsx-renderer'
import { html } from 'hono/html'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export interface MDXComponentProps {
  source: string | Promise<string>
  components?: Record<string, ComponentType>
}

async function compileMDX(source: string | Promise<string>, components: Record<string, ComponentType> = {}): Promise<ComponentType<any>> {
  try {
    const resolvedSource = await Promise.resolve(source)

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

    const result = await compile(resolvedSource, options)
    const compiledCode = String(result)

    const moduleCode = `
      const _runtime = arguments[0];
      const _components = arguments[1] || {};
      const _jsx = _runtime.jsx;
      const _Fragment = _runtime.Fragment;
      const _jsxs = (type, props, ...children) => _jsx(type, { ...props, children });

      function _createMdxContent(props) {
        const { components: _components } = props;
        return (() => {
          ${compiledCode}
          return typeof MDXContent === 'function' ? MDXContent(props) : null;
        })();
      }

      return function MDXComponent(props) {
        return _createMdxContent({
          ...props,
          components: { ..._components, ...props.components }
        });
      };
    `

    const createComponent = new Function('runtime', 'components', moduleCode)
    const Component = createComponent({ jsx, Fragment: Symbol('Fragment') }, components)
    return Component
  } catch (error) {
    console.error('MDX Compilation Error:', error)
    throw new MDXCompilationError(`Failed to compile MDX: ${error}`, typeof source === 'string' ? source : 'async content')
  }
}

export async function createMDXComponent(source: string | Promise<string>, components: Record<string, ComponentType> = {}) {
  try {
    const Component = await compileMDX(source, components)
    return Component
  } catch (error) {
    console.error('MDX Component Creation Error:', error)
    return () => jsx('div', {
      'data-error': true,
      className: 'error',
      'aria-label': 'MDX compilation error'
    }, [String(error)])
  }
}

export const MDXComponent = ({ source, components = {} }: MDXComponentProps): JSXNode => {
  const isTestEnv = process.env.NODE_ENV === 'test'
  const shouldHydrate = !isTestEnv && typeof window !== 'undefined'

  try {
    const promise = createMDXComponent(source, components)
    const element = jsx('div', {
      'data-mdx': true,
      id: 'mdx-root',
      className: 'prose container',
      'data-hydrate': shouldHydrate
    }, [
      jsx(ErrorBoundary, {}, [
        jsx(Suspense, {
          fallback: jsx('div', { className: 'loading' }, ['Loading MDX content...']),
          children: promise.then(Component => {
            try {
              return jsx(Component, { components })
            } catch (error) {
              console.error('Error rendering MDX component:', error)
              return jsx('div', {
                'data-error': true,
                className: 'error',
                'aria-label': 'MDX rendering error'
              }, [String(error)])
            }
          })
        })
      ])
    ])
    return element
  } catch (error) {
    console.error('Error in MDXComponent:', error)
    return jsx('div', {
      'data-error': true,
      className: 'error',
      'aria-label': 'MDX processing error'
    }, ['Failed to process MDX content'])
  }
}

// Client-side hydration
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  const root = document.getElementById('mdx-root')
  if (root && root.getAttribute('data-hydrate') === 'true') {
    try {
      const source = root.innerHTML
      hydrate(jsx(MDXComponent, { source }), root)
    } catch (error) {
      console.error('Hydration error:', error)
    }
  }
}

export function mdx(): MiddlewareHandler {
  const renderer: JsxRendererOptions = {
    docType: true,
    stream: true
  }
  return jsxRenderer(renderer)
}

export function createMDXRenderer(source: string, options: CompileOptions = {}): MiddlewareHandler {
  return async (c) => {
    try {
      const component = await compileMDX(source, {
        ...options,
        jsxImportSource: 'hono/jsx'
      })

      const jsxContent = jsx('div', {}, [
        jsx(ErrorBoundary, {}, [
          jsx(Suspense, {
            fallback: jsx('div', {}, ['Loading MDX content...'])
          }, [
            jsx(component as unknown as ComponentType, {})
          ])
        ])
      ])

      const htmlContent = html`${jsxContent}`
      const stream = await renderToReadableStream(htmlContent)

      return c.body(stream, {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Transfer-Encoding': 'chunked'
        }
      })
    } catch (error) {
      console.error('Error rendering MDX:', error)
      throw new MDXRenderError(`Failed to render MDX: ${error}`)
    }
  }
}

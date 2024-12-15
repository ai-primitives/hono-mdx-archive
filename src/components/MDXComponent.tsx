/** @jsxImportSource hono/jsx */
import { jsx } from 'hono/jsx'
import type { FC, PropsWithChildren } from 'hono/jsx'
import { Suspense } from 'hono/jsx/streaming'
import { Fragment } from 'hono/jsx'
import Layout from './Layout'
import type { CompileOptions } from '@mdx-js/mdx'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { serializeState } from '../hydration/state'
import type { ComponentType as ReactComponentType } from 'react'
import { html } from 'hono/html'
import type { HtmlEscapedString } from 'hono/utils/html'

export type ComponentType = FC<PropsWithChildren<{ components?: Record<string, ComponentType>; 'data-hydrate'?: boolean }>>

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
      outputFormat: 'function-body'
    }

    const { toString } = await compile(mdxSource, options)
    const compiledCode = toString()

    const honoJSXRuntime = {
      jsx,
      Fragment
    }

    const createComponent = new Function('_runtime', '_components', `
      const { jsx, Fragment } = _runtime;
      const components = _components || {};
      ${compiledCode}
      return MDXContent;
    `)

    return createComponent(honoJSXRuntime, components)
  } catch (error) {
    console.error('MDX Compilation Error:', error)
    throw new Error(`Failed to compile MDX: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const MDXComponent = async ({ source, components = {}, hydrate = false }: MDXComponentProps): Promise<HtmlEscapedString> => {
  try {
    const Component = await compileMDX(source, components)
    const isTestEnv = process.env.NODE_ENV === 'test'
    const shouldHydrate = !isTestEnv && (hydrate || typeof window !== 'undefined')
    const serializedState = shouldHydrate ? serializeState({ source, ...components }, components as Record<string, ReactComponentType>) : undefined

    const layout = jsx(Layout, {}, [
      jsx('div', {
        id: 'mdx-root',
        'data-mdx': true,
        'data-hydrate': shouldHydrate,
        'data-source': typeof source === 'string' ? source : undefined,
        'data-state': serializedState,
        className: 'prose dark:prose-invert max-w-none'
      }, [
        jsx(Suspense, {
          fallback: jsx('div', { className: 'loading' }, 'Loading MDX content...')
        }, [
          jsx(Component, {
            components,
            'data-hydrate': shouldHydrate
          })
        ])
      ])
    ])

    return html`${String(layout)}`
  } catch (error) {
    console.error('Error rendering MDX:', error)
    const errorElement = jsx('div', {
      id: 'mdx-root',
      'data-mdx': true,
      'data-error': true,
      className: 'prose dark:prose-invert max-w-none'
    }, `Error rendering MDX: ${error instanceof Error ? error.message : String(error)}`)
    return html`${String(errorElement)}`
  }
}

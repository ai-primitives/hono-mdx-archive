/** @jsxImportSource hono/jsx */
import { jsx } from 'hono/jsx'
import type { FC, PropsWithChildren } from 'hono/jsx'
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

    const mdxContent = await Component({ components, 'data-hydrate': shouldHydrate })

    const rootContent = html`
      <div
        id="mdx-root"
        data-mdx="true"
        data-hydrate="${shouldHydrate}"
        ${typeof source === 'string' ? `data-source="${encodeURIComponent(source)}"` : ''}
        ${serializedState ? `data-state="${encodeURIComponent(serializedState)}"` : ''}
        class="prose dark:prose-invert max-w-none"
      >
        ${String(mdxContent)}
      </div>
    `

    const layout = jsx(Layout, {}, rootContent)
    return html`${String(layout)}`
  } catch (error) {
    console.error('Error rendering MDX:', error)
    return html`
      <div
        id="mdx-root"
        data-mdx="true"
        data-error="true"
        class="prose dark:prose-invert max-w-none error"
      >
        Error rendering MDX: ${error instanceof Error ? error.message : String(error)}
      </div>
    `
  }
}

import { jsx } from 'hono/jsx'
import type { FC, ComponentType } from 'react'
import { compile, type CompileOptions } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { MDXCompilationError, MDXRenderError } from '../utils/errors'

export interface MDXComponentProps {
  source: string | Promise<string>
  components?: Record<string, ComponentType>
  hydrate?: boolean
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
      const _jsxs = _runtime.jsxs || _jsx;

      const MDXContent = (props) => {
        const { components } = props;
        return (() => {
          ${compiledCode}
          return typeof MDXContent === 'function' ? MDXContent({ ...props, components: { ..._components, ...components } }) : null;
        })();
      };

      return function(props) {
        return MDXContent({
          ...props,
          components: { ..._components, ...props.components }
        });
      };
    `

    const createComponent = new Function('runtime', 'components', moduleCode)
    const Component = createComponent({
      jsx,
      Fragment: Symbol('Fragment'),
      jsxs: jsx
    }, components)

    return Component
  } catch (error) {
    console.error('MDX Compilation Error:', error)
    throw new MDXCompilationError(`Failed to compile MDX: ${error}`, typeof source === 'string' ? source : 'async content')
  }
}

export async function createMDXComponent(source: string | Promise<string>, components: Record<string, ComponentType> = {}): Promise<ComponentType<any>> {
  try {
    return await compileMDX(source, components)
  } catch (error) {
    console.error('Error creating MDX component:', error)
    throw error
  }
}

export const MDXComponent: FC<MDXComponentProps> = async ({ source, components = {}, hydrate = false }) => {
  try {
    const Component = await createMDXComponent(source, components)
    const element = jsx('div', {
      id: 'mdx-root',
      'data-mdx': true,
      'data-hydrate': hydrate,
      'data-source': typeof source === 'string' ? source : undefined,
      className: 'prose dark:prose-invert max-w-none'
    }, [jsx(Component, { components })])

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

import { jsx } from 'hono/jsx'
import { compile, type CompileOptions } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { HtmlEscapedString } from 'hono/utils/html'
import type { ComponentType, HonoComponent } from '../types'

const components: Record<string, ComponentType> = {}

interface MDXModule {
  default: (props: { components: Record<string, ComponentType> }) => Promise<string | HtmlEscapedString>
}

export function registerComponent(name: string, component: HonoComponent): void {
  if (!component.displayName) {
    component.displayName = name
  }
  components[name] = component
}

export function getComponents(): Record<string, ComponentType> {
  return components
}

export async function hydrateMDX(rootId = 'mdx-root'): Promise<boolean> {
  try {
    console.log('Starting hydration for rootId:', rootId)
    const root = document.querySelector(`#${rootId}, [data-mdx="true"]`)
    if (!root || root.getAttribute('data-hydrate') !== 'true') {
      console.log('No root element found or hydration not enabled')
      return false
    }

    const source = root.getAttribute('data-source')
    if (!source) {
      console.log('No source found in root element')
      return false
    }
    console.log('Found source:', source)

    const options: CompileOptions = {
      jsx: true,
      jsxImportSource: 'hono/jsx',
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeRaw],
      development: process.env.NODE_ENV === 'development'
    }

    try {
      console.log('Compiling MDX source...')
      const result = String(await compile(source, options))
      console.log('Compiled result:', result)

      const createMDXModule = new Function('jsx', 'components', `
        const Fragment = Symbol('Fragment');
        ${result}
        return { default: MDXContent };
      `)

      console.log('Available components:', Object.keys(components))
      const mdxModule = createMDXModule(jsx, components) as MDXModule
      console.log('MDX module created')

      const rendered = await mdxModule.default({ components })
      console.log('Rendered content:', String(rendered))

      if (rendered) {
        const content = String(rendered)
        console.log('Setting innerHTML:', content)
        root.innerHTML = content

        Object.values(components).forEach(component => {
          if (typeof component === 'function' && 'displayName' in component) {
            const elements = root.querySelectorAll(`[data-component="${component.displayName}"]`)
            elements.forEach(element => {
              const props = JSON.parse(element.getAttribute('data-props') || '{}')
              const result = (component as HonoComponent)(props)
              if (result instanceof Promise) {
                result.then(content => {
                  element.innerHTML = String(content)
                })
              } else {
                element.innerHTML = String(result)
              }
            })
          }
        })

        return true
      }

      console.log('No content to render')
      return false
    } catch (error) {
      console.error('MDX compilation failed:', error)
      return false
    }
  } catch (error) {
    console.error('Hydration failed:', error)
    return false
  }
}

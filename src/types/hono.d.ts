declare module 'hono/jsx' {
  import type { ComponentType } from 'react'

  type Child = JSXNode | string | Promise<JSXNode> | (() => Promise<JSXNode>)
  type Children = Child | Child[]

  interface JSXNode {
    type: string | Function | ComponentType
    props: Record<string, any>
    children?: Children
  }

  // Custom type that works with both Hono and React components
  interface HonoComponent<P = {}> extends ComponentType<P> {
    (props: P): JSXNode
  }

  export function jsx(
    type: string | Function | ComponentType,
    props: Record<string, any>,
    children?: Children
  ): JSXNode

  export namespace JSX {
    interface Element extends JSXNode {}
    interface IntrinsicElements {
      div: any
      span: any
      p: any
      h1: any
      h2: any
      h3: any
      pre: any
      code: any
      suspense: any
      'data-mdx': any
      'data-suspense': any
      'data-error': any
      MDXComponent: {
        source: string | Promise<string>
        components?: Record<string, ComponentType>
      }
      Suspense: {
        children: JSXNode | JSXNode[]
        fallback?: JSXNode
      }
      ErrorBoundary: {
        children: JSXNode | JSXNode[]
        fallback?: HonoComponent<{ error: Error }>
      }
      [elemName: string]: any
    }
  }
}

declare module 'hono' {
  import type { ComponentType } from 'react'
  import type { JSXNode, Children, HonoComponent } from 'hono/jsx'

  export class Hono<E = {}> {
    use(path: string, middleware: (c: Context<E>, next: Next) => Promise<void>): this
    get(path: string, handler: (c: Context<E>) => Response | Promise<Response>): this
  }

  export interface Context<E = {}> {
    jsx: {
      (node: JSXNode): Response
      (type: string | Function | ComponentType, props: Record<string, any>, children?: Children): Response
    }
  }

  export type Next = () => Promise<void>
}

declare global {
  var jsx: any
  var Fragment: any
}

declare module 'hono/jsx' {
  import type { ComponentType } from 'react'

  type Child = JSX.Element | string | Promise<JSX.Element> | (() => Promise<JSX.Element>)
  type Children = Child | Child[]

  interface JSXNode {
    type: string | Function | ComponentType
    props: Record<string, any>
    children?: Children
  }

  interface HonoComponent<P = {}> extends ComponentType<P> {
    (props: P): JSXNode
  }

  export function jsx(
    type: string | Function | ComponentType,
    props: Record<string, any>,
    children?: Children
  ): JSXNode

  export const Fragment: any

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
  import type { Env } from '@hono/types'

  export interface Context<E = {}> {
    req: Request
    env: E
    jsx: {
      (node: JSXNode): Response
      (type: string | Function | ComponentType, props: Record<string, any>, children?: Children): Response
    }
    text: (text: string, status?: number, headers?: Record<string, string>) => Response
    json: <T = any>(obj: T, status?: number, headers?: Record<string, string>) => Response
  }

  export class Hono<E = {}> {
    use(path: string, handler: MiddlewareHandler<E>, ...handlers: MiddlewareHandler<E>[]): Hono<E>
    get(path: string, handler: MiddlewareHandler<E>, ...handlers: MiddlewareHandler<E>[]): Hono<E>
    post(path: string, handler: MiddlewareHandler<E>, ...handlers: MiddlewareHandler<E>[]): Hono<E>
  }

  export type Next = () => Promise<void>
}

declare module 'hono/jsx-renderer' {
  import type { MiddlewareHandler } from 'hono'

  interface JsxRendererOptions {
    docType?: boolean
    stream?: boolean
  }

  export function jsxRenderer(options?: JsxRendererOptions): MiddlewareHandler
}

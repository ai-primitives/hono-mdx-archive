import type { FC } from 'hono/jsx'
import type { HtmlEscapedString } from 'hono/utils/html'
import type { ComponentType as ReactComponentType } from 'react'

// Bridge type between Hono FC and MDX/React components
export interface ComponentProps {
  [key: string]: unknown
  children?: string | HtmlEscapedString | Promise<HtmlEscapedString> | null
}

// Base component type that works with both Hono and React
export type ComponentType = FC<ComponentProps> | ReactComponentType<any>

// Hono-specific component type that extends ComponentType
export interface HonoComponent extends FC<ComponentProps> {
  displayName?: string
}

// Helper type for MDX compilation
export interface MDXContent {
  (props: { components?: Record<string, ComponentType> }): Promise<string | HtmlEscapedString>
}

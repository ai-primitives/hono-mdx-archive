import { jsx } from 'hono/jsx'
import type { ComponentType } from 'react'
import { hydrate } from 'hono/jsx/dom'
import { MDXComponent } from './components/MDXComponent'
import type { MDXComponentProps } from './components/MDXComponent'

// Registry for custom components that need hydration
const componentRegistry: Record<string, ComponentType> = {}

// Register a component for hydration
export function registerComponent(name: string, component: ComponentType) {
  componentRegistry[name] = component
}

// Get registered components
export function getComponents() {
  return { ...componentRegistry }
}

// Hydrate MDX content with registered components
export function hydrateMDX(rootId = 'mdx-root') {
  const root = document.getElementById(rootId)
  if (!root || root.getAttribute('data-hydrate') !== 'true') {
    return false
  }

  try {
    const source = root.getAttribute('data-source') || root.innerHTML
    hydrate(jsx(MDXComponent, {
      source,
      components: getComponents()
    }), root)
    return true
  } catch (error) {
    console.error('MDX Hydration error:', error)
    return false
  }
}

export { MDXComponent, type MDXComponentProps }

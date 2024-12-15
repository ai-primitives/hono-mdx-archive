import { jsx } from 'hono/jsx'
import type { ComponentType } from 'react'
import { hydrate } from 'hono/jsx/dom'
import { MDXComponent } from './components/MDXComponent'
import type { MDXComponentProps } from './components/MDXComponent'
import { deserializeState } from './hydration/state'

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

// Load a component dynamically
export async function loadComponent(name: string): Promise<ComponentType | undefined> {
  if (componentRegistry[name]) {
    return componentRegistry[name]
  }

  try {
    // Attempt to dynamically import the component
    const module = await import(`./components/${name}.tsx`)
    const component = module.default || module[name]
    if (component) {
      registerComponent(name, component)
      return component
    }
  } catch (error) {
    console.error(`Failed to load component ${name}:`, error)
  }
  return undefined
}

// Hydrate MDX content with registered components
export async function hydrateMDX(rootId = 'mdx-root') {
  const root = document.getElementById(rootId)
  if (!root || root.getAttribute('data-hydrate') !== 'true') {
    return false
  }

  try {
    const stateStr = root.getAttribute('data-state')
    const { props, components: componentNames } = stateStr ? deserializeState(stateStr) : { props: {}, components: {} }

    // Load all required components
    const componentPromises = Object.keys(componentNames).map(name => loadComponent(name))
    await Promise.all(componentPromises)

    const source = props.source || root.getAttribute('data-source') || root.innerHTML
    hydrate(jsx(MDXComponent, {
      source,
      components: getComponents(),
      hydrate: true,
      ...props
    }), root)
    return true
  } catch (error) {
    console.error('MDX Hydration error:', error)
    return false
  }
}

export { MDXComponent, type MDXComponentProps }

import type { ComponentType } from 'react'

interface HydrationState {
  props: Record<string, any>
  components: Record<string, string>
  source: string
}

export function serializeState(props: Record<string, any>, components: Record<string, ComponentType>): string {
  const serializedComponents = Object.entries(components).reduce((acc, [name, component]) => {
    acc[name] = typeof component === 'function' ? component.name : 'AnonymousComponent'
    return acc
  }, {} as Record<string, string>)

  const state: HydrationState = {
    props,
    components: serializedComponents,
    source: props.source || ''
  }

  return JSON.stringify(state)
}

export function deserializeState(stateStr: string): HydrationState {
  try {
    return JSON.parse(stateStr)
  } catch (error) {
    console.error('Failed to deserialize hydration state:', error)
    return { props: {}, components: {}, source: '' }
  }
}

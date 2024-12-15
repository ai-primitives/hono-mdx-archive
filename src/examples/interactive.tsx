import { jsx } from 'hono/jsx'
import { registerComponent, hydrateMDX } from '../client'

// Example interactive counter component
function Counter({ initialCount = 0 }) {
  let count = initialCount

  const increment = () => {
    count++
    document.getElementById('count')!.textContent = count.toString()
  }

  return jsx('div', {}, [
    jsx('span', { id: 'count' }, [count.toString()]),
    jsx('button', { onClick: increment }, ['Increment'])
  ])
}

// Register the counter component for hydration
registerComponent('Counter', Counter)

// Hydrate the MDX content when the page loads
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    hydrateMDX()
  })
}

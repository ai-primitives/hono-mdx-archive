# hono-mdx

A powerful MDX runtime for Cloudflare Workers for Platforms, built on Hono's JSX renderer with support for Suspense, streaming, and client-side rendering.

## Features

- Server-side MDX rendering using Hono's built-in JSX renderer
- Support for Suspense and streaming with async MDX content
- Client-side rendering capabilities
- Default styling with PicoCSS and Tailwind CDN
- Build/test/deploy using Wrangler
- Integrated esbuild-wasm with HTTP URL imports
- Monaco editor for MDX editing
- Dual storage support: Cloudflare Workers KV and Clickhouse

## Example

```mdx
---
title: hono-mdx: High-Performance MDX Runtime for Cloudflare Workers
description: Build dynamic MDX applications with Hono's JSX renderer, featuring Suspense, streaming, and seamless deployment to Cloudflare Workers
---

<Hero
  headline="Transform Your MDX Content into Dynamic Web Applications"
  description="Build, deploy, and scale MDX applications with enterprise-grade performance using Hono's JSX renderer and Cloudflare Workers"
/>

<Features
  items={[
    {
      title: 'Server-Side Rendering',
      description: 'Lightning-fast MDX rendering with Hono\'s built-in JSX renderer'
    },
    {
      title: 'Streaming & Suspense',
      description: 'Real-time content updates with async streaming capabilities'
    },
    {
      title: 'Client-Side Hydration',
      description: 'Seamless client-side interactivity with React components'
    },
    {
      title: 'Enterprise Storage',
      description: 'Flexible storage options with Workers KV and Clickhouse'
    }
  ]}
/>
```

## Installation

```bash
npm install hono-mdx
```

## Usage

### CLI

Build and develop MDX files with Wrangler:

```bash
# Development mode
npx hono-mdx dev

# Build for production
npx hono-mdx build

# Deploy to Cloudflare Workers
npx hono-mdx deploy
```

### Server-Side Rendering

```jsx
import { jsx } from 'hono/jsx'
import { MDXComponent } from 'hono-mdx'

// Basic usage
app.get('/', (c) => {
  return c.jsx(<MDXComponent source={mdxContent} />)
})

// With Suspense for async content
app.get('/async', (c) => {
  return c.jsx(
    <Suspense fallback={<div>Loading...</div>}>
      <MDXComponent source={asyncMdxContent} />
    </Suspense>
  )
})
```

### Client-Side Rendering

```jsx
import { MDXComponent } from 'hono-mdx/client'

// Hydrate server-rendered content
hydrate(<MDXComponent source={mdxContent} />, document.getElementById('root'))
```

### MDX Editor

```jsx
import { MDXEditor } from 'hono-mdx/editor'

// Monaco-based MDX editor with preview
function Editor() {
  return (
    <MDXEditor
      value={mdxContent}
      onChange={handleChange}
      preview={true}
    />
  )
}
```

### CRUD API

```typescript
import { MDXStore } from 'hono-mdx/store'

// Using Workers KV
const kvStore = new MDXStore({
  type: 'kv',
  namespace: 'MDX_CONTENT'
})

// Using Clickhouse
const clickhouseStore = new MDXStore({
  type: 'clickhouse',
  connection: {
    url: 'https://your-clickhouse-server',
    database: 'mdx_db'
  }
})

// CRUD operations
await store.create('my-doc', mdxContent)
const doc = await store.read('my-doc')
await store.update('my-doc', newContent)
await store.delete('my-doc')
const allDocs = await store.list()
```

## Configuration

### wrangler.toml

```toml
name = "my-mdx-app"
type = "javascript"
workers_dev = true

[build]
command = "npm run build"
watch_dir = "src"

[build.upload]
format = "modules"
main = "./worker.js"

[env.production]
kv_namespaces = [
  { binding = "MDX_CONTENT", id = "xxx" }
]
```

### Styling

The package includes PicoCSS by default and can be enhanced with Tailwind:

```html
<!-- Include Tailwind CDN in your HTML -->
<script src="https://cdn.tailwindcss.com"></script>
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

MIT

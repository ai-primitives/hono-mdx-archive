[![npm version](https://badge.fury.io/js/hono-mdx.svg)](https://badge.fury.io/js/hono-mdx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# hono-mdx

A powerful MDX runtime for Cloudflare Workers for Platforms, built on Hono's JSX renderer with support for Suspense, streaming, and client-side rendering.

## Features

- Server-side MDX rendering using Hono's built-in JSX renderer
- Full streaming support with proper JSX children handling
- Suspense integration with async content and proper HTML escaping
- Client-side hydration with HtmlEscapedString support
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
  headline='Transform Your MDX Content into Dynamic Web Applications'
  description='Build, deploy, and scale MDX applications with enterprise-grade performance using Hono&apos;s JSX renderer and Cloudflare Workers'
/>

<Features
  items={[
    {
      title: 'Server-Side Rendering',
      description: 'Lightning-fast MDX rendering with Hono&apos;s built-in JSX renderer'
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

// Basic usage with streaming support
app.get('/', (c) => {
  return c.jsx(<MDXComponent source={mdxContent} />)
})

// Advanced streaming with Suspense boundaries
app.get('/async', (c) => {
  return c.jsx(
    <Suspense fallback={<div>Loading...</div>}>
      <Layout>
        <MDXComponent
          source={asyncMdxContent}
          components={{
            // Custom components with proper HTML escaping
            CustomComponent: ({ children }) => <div className='custom'>{children}</div>
          }}
        />
      </Layout>
    </Suspense>
  )
})
```

### Streaming Features

The streaming implementation provides:
- Full JSX children handling with proper HTML escaping
- Suspense boundary support for async content
- Layout component integration
- HtmlEscapedString support for safe content rendering
- Proper handling of nested async components
- Automatic content chunking for optimal performance

Example with nested async components:

```jsx
app.get('/nested', (c) => {
  return c.jsx(
    <Suspense fallback={<div>Loading outer...</div>}>
      <AsyncComponent>
        <Suspense fallback={<div>Loading inner...</div>}>
          <MDXComponent source={asyncContent} />
        </Suspense>
      </AsyncComponent>
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

## TypeScript Configuration

Configure TypeScript for proper JSX support:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

For testing with Vitest, ensure your configuration includes:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node'
  }
})
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

## Dependencies

- hono: ^4.0.0
- esbuild-wasm: ^0.24.0
- @picocss/pico: ^2.0.6
- @monaco-editor/react: ^4.6.0
- @clickhouse/client-web: ^1.9.1

## License

MIT

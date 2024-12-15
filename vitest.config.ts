/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypePrism from 'rehype-prism'

export default defineConfig({
  plugins: [
    mdx({
      jsxImportSource: 'hono/jsx',
      remarkPlugins: [remarkGfm],
      rehypePlugins: [[rehypeRaw, { passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'] }], rehypePrism],
      providerImportSource: false
    }),
    react()
  ],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    deps: {
      inline: [/@mdx-js\/mdx/, /@mdx-js\/react/, /remark-.*/, /rehype-.*/]
    }
  }
})

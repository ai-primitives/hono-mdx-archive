/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
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
      providerImportSource: '@mdx-js/react'
    })
  ],
  test: {
    environment: 'miniflare3',
    environmentOptions: {
      modules: true,
      bindings: {
        DB: 'D1Database'
      }
    },
    pool: '@cloudflare/vitest-pool-workers',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['src/**/platform.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    deps: {
      inline: [/hono/, /@mdx-js\/mdx/, /@mdx-js\/react/, /remark-.*/, /rehype-.*/]
    }
  }
})

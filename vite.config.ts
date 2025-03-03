import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeHighlight]
    }),
    react()
  ],
  build: {
    target: 'esnext',
    lib: {
      entry: {
        index: 'src/index.ts',
        worker: 'src/worker.ts'
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'hono'],
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'hono': 'Hono'
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@mdx-js/mdx', 'hono']
  }
})

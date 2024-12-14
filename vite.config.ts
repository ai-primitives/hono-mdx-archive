import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'HonoMDX',
      formats: ['es', 'umd'],
      fileName: (format) => `hono-mdx.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'hono'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          hono: 'Hono'
        }
      }
    }
  }
})

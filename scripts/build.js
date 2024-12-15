import { build } from 'esbuild-wasm'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { uploadWorkerScript } from '../src/utils/cloudflare.js'

async function buildWorker() {
  try {
    // Build worker
    const result = await build({
      entryPoints: ['src/worker.ts'],
      bundle: true,
      format: 'esm',
      outfile: 'dist/worker.js',
      platform: 'browser',
      target: 'es2020',
      minify: true,
      sourcemap: true,
      external: ['__STATIC_CONTENT_MANIFEST'],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      plugins: [{
        name: 'mdx',
        setup(build) {
          build.onLoad({ filter: /\.mdx$/ }, async (args) => {
            const source = await readFile(args.path, 'utf8')
            return {
              contents: `export default ${JSON.stringify(source)}`,
              loader: 'js'
            }
          })
        }
      }]
    })

    console.log('Worker build completed successfully!')

    // Deploy worker if environment variables are set
    if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) {
      const workerScript = await readFile('dist/worker.js', 'utf8')
      const config = {
        accountId: process.env.CF_ACCOUNT_ID,
        apiToken: process.env.CF_API_TOKEN,
        scriptName: 'hono-mdx'
      }

      await uploadWorkerScript(workerScript, config)
      console.log('Worker deployed successfully!')
    }
  } catch (error) {
    console.error('Build/deploy failed:', error)
    process.exit(1)
  }
}

buildWorker()

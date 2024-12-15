import { build as esbuild } from 'esbuild'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

export async function build(options) {
  try {
    const result = await esbuild({
      entryPoints: [options.entry],
      bundle: true,
      outdir: options.outdir,
      minify: options.minify,
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      plugins: [NodeModulesPolyfillPlugin()],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    })

    return { success: true, result }
  } catch (error) {
    console.error('Build failed:', error)
    return { success: false, error }
  }
}

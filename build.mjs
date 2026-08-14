import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const ID = '@samecorner/dsh-client-ui-token-usage'

// 与 DSH 的 tsdown.client.ts 一致的平台模块表（浏览器端 loader 的 module table）。
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

// 1) 浏览器端 bundle：lib/client.js（CJS + __ModuleLoader__.load 包装）
await build({
  entryPoints: [join(ROOT, 'src/client/index.ts')],
  outfile: join(ROOT, 'lib/client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  external: PLATFORM_MODULES,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  // Mirror tsdown.client.ts's outputOptions intro — the CJS code emitted by
  // esbuild writes `module.exports = ...`, and the loader invokes the factory
  // with only `require`. The declaration must precede the bundle body inside
  // the factory scope, or materialization throws `module is not defined` and
  // the boot screen reports "Failed to load plugins".
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

// 2) Node half：lib/index.js（ESM，无需打包）
const nodeHalf = `/** Host loader entry for the browser-only token usage plugin. */
export function apply() {}
`
mkdirSync(join(ROOT, 'lib'), { recursive: true })
writeFileSync(join(ROOT, 'lib/index.js'), nodeHalf)

console.log('built lib/client.js + lib/index.js')

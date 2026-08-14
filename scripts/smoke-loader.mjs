// Simulates ClientModuleSystem.load + materialize (factory called with require
// only). Verifies the bundle shape required by the DSH web module table:
//   - registers via window.__ModuleLoader__.load({ id, factory })
//   - materializing factory(require) does not throw (module is declared)
//   - exports carry apply + inject
//   - every require only hits platform seed words
// Run: node scripts/smoke-loader.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = dirname(fileURLToPath(import.meta.url))
const BUNDLE = join(ROOT, '..', 'lib', 'client.js')

const code = readFileSync(BUNDLE, 'utf8')
let registered = null
const context = {
  console,
  window: { __ModuleLoader__: { load: ({ id, factory }) => { registered = { id, factory } } } },
}
vm.createContext(context)
vm.runInContext(code, context)
if (registered === null) throw new Error('bundle did not register via __ModuleLoader__.load')
console.log('registered id:', registered.id)

const seed = {
  'react': { default: {} },
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'f' },
}
const seen = new Map()
const requireFn = (spec) => {
  seen.set(spec, (seen.get(spec) ?? 0) + 1)
  if (seed[spec] !== undefined) return seed[spec]
  throw new Error(`require("${spec}") missed the module table — externals drift or cross-plugin value import`)
}
const exports_ = registered.factory(requireFn)
console.log('requires:', [...seen.entries()].map(([k, n]) => `${k}×${n}`).join(', ') || '(none)')
if (typeof exports_.apply !== 'function') throw new Error('exports.apply missing')
if (!Array.isArray(exports_.inject)) throw new Error('exports.inject missing')
console.log('inject:', exports_.inject)
console.log('SMOKE TEST PASSED')
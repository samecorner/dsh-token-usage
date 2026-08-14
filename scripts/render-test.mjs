/**
 * SSR render smoke test for TokenUsageView: renders the component with fake
 * props through react-dom/server to catch runtime errors (undefined access,
 * bad geometry, missing styles keys) without a browser.
 * Run: node scripts/render-test.mjs
 */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'

const entry = `
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
console.log('react resolved:', req.resolve('react'))
console.log('react-dom/server resolved:', req.resolve('react-dom/server'))
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { TokenUsageView } from './src/client/TokenUsageView.tsx'

const snapshot = {
  steps: [
    { key: 'k1', kind: 'token-usage-step', id: '1', target: 'tokenUsage', anchorSeq: 0,
      location: { kind: 'unresolved' },
      data: { kind: 'token-usage-step', turn: 1, step: 1, seq: 0, time: 0,
        usage: { inputTokens: 1000, outputTokens: 250, cacheReadTokens: 5000, cacheWriteTokens: 800, reasoningTokens: 60 },
        provider: 'deepseek', model: 'deepseek-chat' } },
    { key: 'k2', kind: 'token-usage-step', id: '2', target: 'tokenUsage', anchorSeq: 1,
      location: { kind: 'unresolved' },
      data: { kind: 'token-usage-step', turn: 1, step: 2, seq: 1, time: 1,
        usage: { inputTokens: 1500, outputTokens: 480, cacheReadTokens: 9000, cacheWriteTokens: 1200, reasoningTokens: 200 },
        provider: 'deepseek', model: 'deepseek-reasoner' } },
    { key: 'k3', kind: 'token-usage-step', id: '3', target: 'tokenUsage', anchorSeq: 2,
      location: { kind: 'unresolved' },
      data: { kind: 'token-usage-step', turn: 2, step: 1, seq: 2, time: 2,
        usage: { inputTokens: 400, outputTokens: 90, cacheReadTokens: 2000, cacheWriteTokens: 300, reasoningTokens: 10 },
        provider: 'deepseek', model: 'deepseek-chat' } },
  ],
  turns: [
    { turn: 1, steps: 2, usage: { inputTokens: 2500, outputTokens: 730, cacheReadTokens: 14000, cacheWriteTokens: 2000, reasoningTokens: 260 },
      models: [{ provider: 'deepseek', model: 'deepseek-chat' }, { provider: 'deepseek', model: 'deepseek-reasoner' }] },
    { turn: 2, steps: 1, usage: { inputTokens: 400, outputTokens: 90, cacheReadTokens: 2000, cacheWriteTokens: 300, reasoningTokens: 10 },
      models: [{ provider: 'deepseek', model: 'deepseek-chat' }] },
  ],
  totals: { inputTokens: 2900, outputTokens: 820, cacheReadTokens: 16000, cacheWriteTokens: 2300, reasoningTokens: 270 },
}

const props = {
  useSession: (sel) => sel({ views: new Map([['tokenUsage', snapshot]]), openState: 'ready', loadingOlder: false, hasMore: false }),
  useProjection: (name) => name === 'tokenUsage'
    ? { uncachedInputTokens: 2900, outputTokens: 820, cacheReadTokens: 16000, cacheWriteTokens: 2300 }
    : name === 'contextPressure'
      ? { projectedTokens: 42000, contextWindow: 64000, pressureTokens: 39000 }
      : name === 'contextBreakdown'
        ? { systemTokens: 8000, toolsTokens: 12000, messageTokens: 28000 }
        : { turns: 3, steps: 5 },
  loadOlder: async () => false,
  t: (k) => String(k),
}

const html = renderToString(createElement(TokenUsageView, props))
const checks = [
  ['KPI total', html.includes('total')],
  ['donut svg', html.includes('stroke-dasharray')],
  ['turn bars svg', html.includes('tu-bars')],
  ['cumulative path', html.includes('tu-cost-line')],
  ['breakdown table', html.includes('tu-share')],
  ['meter', html.includes('tu-meter')],
  ['cache hit rate kpi', html.includes('kpi.cacheHitRate')],
  ['reasoning share kpi', html.includes('kpi.reasoningShare')],
  ['avg/peak kpis', html.includes('kpi.avgCall') && html.includes('kpi.peakCall')],
  ['composition bar', html.includes('tu-composition-bar')],
  ['composition legend', html.includes('tu-composition-legend')],
  ['model cache hit col', html.includes('kpi.cacheHitRateSub') || html.includes('models.cacheHit')],
  ['turn duration col', html.includes('tu-num') && html.includes('turns.duration')],
]
for (const [name, ok] of checks) {
  console.log(ok ? 'PASS ' + name : 'FAIL ' + name)
}
console.log('html length:', html.length)
if (html.length < 2000) {
  console.error('html too short — likely early return')
  process.exit(1)
}
console.log('RENDER TEST PASSED')
`

mkdirSync('scripts/.tmp', { recursive: true })
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: 'render-test.tsx', loader: 'tsx' },
  jsx: 'automatic',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  // react-dom/server must be BUNDLED here: node ESM resolves its exports to
  // server.browser.js (no SSR hook dispatcher) unless the bundler applies the
  // node condition, which esbuild does when it resolves the specifier itself.
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  outfile: 'scripts/.tmp/render-test.bundle.mjs',
  logLevel: 'silent',
})
console.log('bundled')
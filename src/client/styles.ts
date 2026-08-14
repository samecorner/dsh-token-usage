/**
 * Self-contained stylesheet for the token usage view: a plain CSS string
 * injected into <head> on first mount. Kept dependency-free so any bundler
 * can build the plugin without a CSS-modules pipeline.
 *
 * Visual language follows pi-web-token-usage: a `--tu-*` semantic color layer
 * mapped onto the host theme's `--dsw-alias-*` variables (with neutral
 * fallbacks), KPI cards with accent values, gradient context meter, SVG
 * charts (stacked turn bars, cumulative curve, composition donut) animated
 * through CSS transitions/keyframes.
 */

const TAG_ID = 'dsh-token-usage-styles'

/** Class map mirroring the selectors below. */
export const styles = {
  root: 'tu-root',
  toolbar: 'tu-toolbar',
  button: 'tu-button',
  buttonPrimary: 'tu-button-primary',
  center: 'tu-center',
  emptyIcon: 'tu-empty-icon',
  emptyTitle: 'tu-empty-title',
  emptyBody: 'tu-empty-body',
  kpis: 'tu-kpis',
  kpiCard: 'tu-kpi-card',
  kpiAccent: 'tu-kpi-accent',
  kpiOutput: 'tu-kpi-output',
  kpiCache: 'tu-kpi-cache',
  kpiValue: 'tu-kpi-value',
  kpiLabel: 'tu-kpi-label',
  kpiSub: 'tu-kpi-sub',
  kpiWide: 'tu-kpi-wide',
  meterWrap: 'tu-meter-wrap',
  meter: 'tu-meter',
  meterWarn: 'tu-meter-warn',
  meterRow: 'tu-meter-row',
  summary: 'tu-summary',
  section: 'tu-section',
  sectionTitle: 'tu-section-title',
  sectionNote: 'tu-section-note',
  table: 'tu-table',
  num: 'tu-num',
  subRow: 'tu-sub-row',
  muted: 'tu-muted',
  name: 'tu-name',
  swatch: 'tu-swatch',
  swatchInput: 'tu-swatch-input',
  swatchCacheRead: 'tu-swatch-cache-read',
  swatchCacheWrite: 'tu-swatch-cache-write',
  swatchOutput: 'tu-swatch-output',
  swatchReasoning: 'tu-swatch-reasoning',
  shareCell: 'tu-share-cell',
  share: 'tu-share',
  donutRow: 'tu-donut-row',
  donutBox: 'tu-donut-box',
  legend: 'tu-legend',
  legendItem: 'tu-legend-item',
  legendPct: 'tu-legend-pct',
  chartBox: 'tu-chart-box',
  chart: 'tu-chart',
  chartEmpty: 'tu-chart-empty',
  grid: 'tu-grid',
  ytick: 'tu-ytick',
  bars: 'tu-bars',
  seg: 'tu-seg',
  segInput: 'tu-seg-input',
  segCacheRead: 'tu-seg-cache-read',
  segCacheWrite: 'tu-seg-cache-write',
  segOutput: 'tu-seg-output',
  hit: 'tu-hit',
  tip: 'tu-tip',
  costLine: 'tu-cost-line',
  costArea: 'tu-cost-area',
  arcTrack: 'tu-arc-track',
  arc: 'tu-arc',
  arcInput: 'tu-arc-input',
  arcCacheRead: 'tu-arc-cache-read',
  arcCacheWrite: 'tu-arc-cache-write',
  arcOutput: 'tu-arc-output',
  donutValue: 'tu-donut-value',
  donutCaption: 'tu-donut-caption',
  tooltip: 'tu-tooltip',
  tooltipVisible: 'tu-tooltip-visible',
  tooltipHead: 'tu-tooltip-head',
  tooltipLine: 'tu-tooltip-line',
  bar: 'tu-bar',
  barCacheRead: 'tu-bar-cache-read',
  barInput: 'tu-bar-input',
  barCacheWrite: 'tu-bar-cache-write',
  barOutput: 'tu-bar-output',
} as const

const CSS = `
.tu-root {
  display: flex; flex-direction: column; gap: 18px; padding: 18px 20px;
  color: var(--tu-text); font-size: 13px; line-height: 1.45;
  --tu-input: var(--dsw-alias-state-business-primary, #4c8dff);
  --tu-output: var(--dsw-alias-state-success-primary, #2da44e);
  --tu-cache-read: #b28df0;
  --tu-cache-write: var(--dsw-alias-state-warn-primary, #d29922);
  --tu-reasoning: var(--dsw-alias-state-error-primary, #f85149);
  --tu-accent: var(--dsw-alias-brand-primary, #4c8dff);
  --tu-text: var(--dsw-alias-label-primary, #24292f);
  --tu-text-muted: var(--dsw-alias-label-secondary, #57606a);
  --tu-text-dim: var(--dsw-alias-label-tertiary, #6e7781);
  --tu-bg-card: var(--dsw-alias-button-elevated-fill, #ffffff);
  --tu-bg-subtle: var(--dsw-alias-bg-layer-1, #f6f8fa);
  --tu-bg-track: var(--dsw-alias-bg-layer-2, #eaeef2);
  --tu-border: var(--dsw-alias-border-l2, #d0d7de);
  --tu-border-subtle: var(--dsw-alias-border-l3, #eaeef2);
  --tu-hover: var(--dsw-alias-interactive-bg-hover, #f3f4f6);
  --tu-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.tu-root * { box-sizing: border-box; }

/* ---------------- toolbar ---------------- */

.tu-toolbar { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
.tu-button {
  padding: 5px 12px; border: 1px solid var(--tu-border); border-radius: 8px;
  background: var(--tu-bg-card); color: var(--tu-text-muted);
  font: inherit; font-size: 12px; cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.tu-button:hover:not(:disabled) { background: var(--tu-hover); color: var(--tu-text); border-color: var(--tu-border); }
.tu-button:disabled { opacity: 0.45; cursor: default; }
.tu-button-primary { color: var(--tu-accent); border-color: color-mix(in srgb, var(--tu-accent) 35%, transparent); }
.tu-button-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--tu-accent) 10%, transparent); }

/* ---------------- empty state ---------------- */

.tu-center { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 56px 16px; text-align: center; }
.tu-empty-icon {
  width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center;
  background: var(--tu-bg-subtle); color: var(--tu-text-dim); font-size: 20px; margin-bottom: 4px;
}
.tu-empty-title { font-weight: 600; font-size: 14px; }
.tu-empty-body { color: var(--tu-text-muted); max-width: 420px; font-size: 12.5px; }

/* ---------------- KPI cards ---------------- */

.tu-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.tu-kpi-card {
  position: relative; display: flex; flex-direction: column; gap: 3px;
  padding: 12px 14px; border: 1px solid var(--tu-border-subtle); border-radius: 12px;
  background: var(--tu-bg-card); min-width: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.tu-kpi-card::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 3px;
  border-radius: 12px 12px 0 0; background: var(--tu-bg-track); opacity: 0.9;
  transition: background 0.25s ease;
}
.tu-kpi-card:hover { transform: translateY(-1px); box-shadow: var(--tu-shadow); border-color: var(--tu-border); }
.tu-kpi-accent::before { background: var(--tu-accent); }
.tu-kpi-output::before { background: var(--tu-output); }
.tu-kpi-cache::before { background: var(--tu-cache-read); }
.tu-kpi-label { font-size: 11px; color: var(--tu-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tu-kpi-value { font-size: 20px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; overflow-wrap: anywhere; }
.tu-kpi-accent .tu-kpi-value { color: var(--tu-accent); }
.tu-kpi-output .tu-kpi-value { color: var(--tu-output); }
.tu-kpi-cache .tu-kpi-value { color: var(--tu-cache-read); }
.tu-kpi-sub { font-size: 10.5px; color: var(--tu-text-dim); font-variant-numeric: tabular-nums; }
.tu-kpi-wide { grid-column: span 2; }

/* ---------------- context meter ---------------- */

.tu-meter-wrap { display: grid; gap: 6px; margin-top: 2px; }
.tu-meter { height: 10px; border-radius: 999px; background: var(--tu-bg-track); overflow: hidden; }
.tu-meter > span {
  display: block; height: 100%; width: 0; border-radius: 999px;
  background: linear-gradient(90deg, var(--tu-input), var(--tu-output));
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.tu-meter-warn > span { background: linear-gradient(90deg, var(--tu-cache-write), var(--tu-reasoning)); }
.tu-meter-row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--tu-text-dim); font-variant-numeric: tabular-nums; }

/* ---------------- summary strip (turns · steps · reasoning) ---------------- */

.tu-summary { display: flex; flex-wrap: wrap; gap: 8px; }
.tu-summary .tu-kpi-card { flex: 1 1 130px; }

/* ---------------- sections ---------------- */

.tu-section { display: flex; flex-direction: column; gap: 10px; }
.tu-section-title {
  margin: 0; font-size: 11px; font-weight: 650; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--tu-text-muted); display: flex; align-items: baseline; gap: 8px;
}
.tu-section-note { font-size: 10px; letter-spacing: 0; text-transform: none; color: var(--tu-text-dim); }

/* ---------------- breakdown table ---------------- */

.tu-table { width: 100%; border-collapse: collapse; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.tu-table th, .tu-table td { padding: 7px 8px; text-align: left; }
.tu-table th { font-size: 10.5px; font-weight: 550; color: var(--tu-text-dim); border-bottom: 1px solid var(--tu-border-subtle); white-space: nowrap; }
.tu-table td { border-bottom: 1px solid var(--tu-border-subtle); }
.tu-table tbody tr { transition: background 0.12s ease; }
.tu-table tbody tr:hover { background: var(--tu-hover); }
.tu-table tbody tr:last-child td { border-bottom: none; }
.tu-num { text-align: right; }
.tu-sub-row td { color: var(--tu-text-muted); font-size: 11.5px; }
.tu-sub-row td:first-child { padding-left: 22px; }
.tu-muted { color: var(--tu-text-muted); font-size: 12.5px; }
.tu-name { display: inline-flex; align-items: center; gap: 7px; overflow-wrap: anywhere; }

.tu-swatch { width: 9px; height: 9px; border-radius: 3px; flex: 0 0 auto; }
.tu-swatch-input { background: var(--tu-input); }
.tu-swatch-cache-read { background: var(--tu-cache-read); }
.tu-swatch-cache-write { background: var(--tu-cache-write); }
.tu-swatch-output { background: var(--tu-output); }
.tu-swatch-reasoning { background: var(--tu-reasoning); }

.tu-share-cell { width: 74px; padding-left: 10px; }
.tu-share { position: relative; width: 100%; min-width: 30px; height: 6px; border-radius: 999px; background: var(--tu-bg-track); overflow: hidden; }
.tu-share > i {
  display: block; height: 100%; width: 0; border-radius: 999px;
  background: var(--tu-accent);
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---------------- donut + legend ---------------- */

.tu-donut-row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.tu-donut-box { flex: 0 0 auto; }
.tu-legend { flex: 1 1 150px; min-width: 0; display: grid; gap: 5px; }
.tu-legend-item {
  display: grid; grid-template-columns: 9px 1fr auto; align-items: center; gap: 8px;
  font-size: 12px; color: var(--tu-text-muted); font-variant-numeric: tabular-nums;
}
.tu-legend-pct { color: var(--tu-text-dim); font-size: 11px; }

/* ---------------- charts ---------------- */

.tu-chart-box { position: relative; width: 100%; }
.tu-chart { display: block; width: 100%; height: auto; overflow: visible; }
.tu-chart-empty { padding: 12px 4px; font-size: 12px; color: var(--tu-text-dim); }

.tu-grid { stroke: var(--tu-border-subtle); stroke-width: 1; shape-rendering: crispEdges; }
.tu-ytick { fill: var(--tu-text-dim); font-size: 9.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

.tu-bars { animation: tu-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1); transform-origin: 50% 100%; }
.tu-seg { transition: x 0.35s ease, y 0.4s cubic-bezier(0.22, 1, 0.36, 1), width 0.35s ease, height 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
.tu-seg-input { fill: var(--tu-input); }
.tu-seg-cache-read { fill: var(--tu-cache-read); }
.tu-seg-cache-write { fill: var(--tu-cache-write); }
.tu-seg-output { fill: var(--tu-output); }
.tu-hit { fill: transparent; cursor: crosshair; }
.tu-hit:hover { fill: var(--tu-accent); fill-opacity: 0.14; }

.tu-cost-area { fill: var(--tu-output); fill-opacity: 0.13; stroke: none; transition: d 0.35s ease; }
.tu-cost-line { fill: none; stroke: var(--tu-output); stroke-width: 1.75; stroke-linejoin: round; stroke-linecap: round; transition: d 0.35s ease; }
.tu-tip { fill: var(--tu-output); transition: cx 0.35s ease, cy 0.35s ease; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25)); }

.tu-arc-track { stroke: var(--tu-bg-track); }
.tu-arc { transition: stroke-dasharray 0.55s cubic-bezier(0.22, 1, 0.36, 1), stroke-dashoffset 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
.tu-arc:hover { filter: brightness(1.15); }
.tu-arc-input { stroke: var(--tu-input); }
.tu-arc-cache-read { stroke: var(--tu-cache-read); }
.tu-arc-cache-write { stroke: var(--tu-cache-write); }
.tu-arc-output { stroke: var(--tu-output); }
.tu-donut-value { fill: var(--tu-text); font-size: 15px; font-weight: 650; font-variant-numeric: tabular-nums; }
.tu-donut-caption { fill: var(--tu-text-dim); font-size: 8.5px; }

@keyframes tu-rise {
  from { transform: scaleY(0.02); opacity: 0.3; }
  to { transform: scaleY(1); opacity: 1; }
}

/* ---------------- tooltip ---------------- */

.tu-tooltip {
  position: absolute; z-index: 5; pointer-events: none;
  min-width: 140px; max-width: 240px; padding: 7px 9px; border-radius: 8px;
  border: 1px solid var(--tu-border); background: var(--tu-bg-card);
  box-shadow: var(--tu-shadow);
  font-size: 11px; color: var(--tu-text-muted); font-variant-numeric: tabular-nums;
  opacity: 0; transform: translateY(2px);
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.tu-tooltip-visible { opacity: 1; transform: translateY(0); }
.tu-tooltip-head { color: var(--tu-text); font-weight: 600; margin-bottom: 4px; overflow-wrap: anywhere; }
.tu-tooltip-line { display: flex; justify-content: space-between; gap: 12px; }
.tu-tooltip-line .tu-dot { width: 7px; height: 7px; border-radius: 2px; align-self: center; }
.tu-tooltip-line .tu-grow { display: inline-flex; align-items: center; gap: 6px; color: var(--tu-text-muted); }

/* ---------------- per-turn table bars ---------------- */

.tu-bar { display: flex; width: 150px; height: 11px; border-radius: 3px; overflow: hidden; background: var(--tu-bg-track); }
.tu-bar > span { transition: width 0.35s ease; }
.tu-bar-cache-read { background: var(--tu-cache-read); }
.tu-bar-input { background: var(--tu-input); }
.tu-bar-cache-write { background: var(--tu-cache-write); }
.tu-bar-output { background: var(--tu-output); }

@media (prefers-reduced-motion: reduce) {
  .tu-root *, .tu-root *::before, .tu-root *::after { animation: none !important; transition: none !important; }
}
`

/**
 * Inject the stylesheet once and return a disposer that removes it only when
 * no other mounted view instance references it.
 * @returns a function removing this instance's reference.
 */
export function injectTokenUsageStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  let tag = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${TAG_ID}"]`)
  if (tag === null) {
    tag = document.createElement('style')
    tag.dataset.plugin = '@deepseek-ai/dsh-client-ui-token-usage'
    tag.dataset.pluginCss = TAG_ID
    tag.textContent = CSS
    document.head.appendChild(tag)
  }
  let mounted = 1
  return () => {
    mounted -= 1
    if (mounted === 0) tag?.remove()
  }
}
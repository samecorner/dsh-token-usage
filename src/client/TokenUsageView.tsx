import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the tokenUsage/contextPressure and sessionStats
// SessionProjectionMap merges into the program for useProjection typing.
import type {} from '@deepseek-ai/dsh-token-meter/client'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {
  TokenUsageSnapshot, TokenUsageTurnRow, UsageValue,
} from './token-usage-contract.ts'
import { EMPTY_TOKEN_USAGE_SNAPSHOT } from './token-usage-snapshot-builder.ts'
import { injectTokenUsageStyles, styles } from './styles.ts'

/** Business callbacks injected into the token usage conversation view. */
export interface TokenUsageViewInjected {
  /**
   * Extend the history window backwards.
   * @returns true when the window actually grew.
   */
  loadOlder: () => Promise<boolean>
}

/** Billed base: uncached input plus cache writes plus output (cache reads excluded). */
function billedOf(usage: UsageValue): number {
  return usage.inputTokens + usage.cacheWriteTokens + usage.outputTokens
}

/** Total across every bucket including cache reads. */
function totalOf(usage: UsageValue): number {
  return billedOf(usage) + usage.cacheReadTokens
}

function formatTokens(value: number): string {
  return Math.round(value).toLocaleString()
}

function shareOf(value: number, base: number): string {
  return base <= 0 ? '—' : `${((value / base) * 100).toFixed(1)}%`
}

/* ------------------------------------------------------------------ */
/* Count-up hook: animates a number toward its target with an ease-out  */
/* curve. Honors prefers-reduced-motion (jumps straight to the target). */
/* ------------------------------------------------------------------ */

function useCountUp(value: number, duration = 650): number {
  const [display, setDisplay] = useState(value)
  const current = useRef(value)
  useEffect(() => {
    const from = current.current
    if (from === value) return
    if (typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = value
      setDisplay(value)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = from + (value - from) * eased
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else current.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      current.current = value
    }
  }, [value, duration])
  return display
}

/* ------------------------------------------------------------------ */
/* KPI card                                                            */
/* ------------------------------------------------------------------ */

function KpiCard({
  label, value, sub, kind, t,
}: {
  readonly label: string
  readonly value: number | string
  readonly sub?: string
  readonly kind?: 'accent' | 'output' | 'cache'
  readonly t: PropsLocale<'token-usage'>['t']
}) {
  const numeric = typeof value === 'number'
  const animated = useCountUp(numeric ? value : 0)
  const rendered = numeric ? formatTokens(animated) : value
  const cls = kind === 'accent' ? styles.kpiAccent : kind === 'output' ? styles.kpiOutput : kind === 'cache' ? styles.kpiCache : ''
  return (
    <div className={`${styles.kpiCard} ${cls}`.trim()}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{rendered}</span>
      {sub !== undefined && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  )
}

/** Context-window occupancy meter inside a wide KPI card. */
function OccupancyKpi({
  percent, detail, warn, t,
}: {
  readonly percent: number | undefined
  readonly detail: string | undefined
  readonly warn: boolean
  readonly t: PropsLocale<'token-usage'>['t']
}) {
  const width = percent === undefined ? 0 : Math.min(100, Math.max(0, percent))
  const animated = useCountUp(width)
  return (
    <div className={`${styles.kpiCard} ${styles.kpiWide} ${styles.kpiAccent}`.trim()}>
      <span className={styles.kpiLabel}>{t('kpi.occupancy')}</span>
      <span className={styles.kpiValue}>
        {percent === undefined ? t('kpi.unknown') : `${percent.toFixed(1)}%`}
      </span>
      <span className={styles.kpiSub}>{detail ?? t('kpi.occupancySub')}</span>
      <div className={styles.meterWrap}>
        <div className={`${styles.meter} ${warn ? styles.meterWarn : ''}`.trim()}>
          <span style={{ width: `${animated}%` }} />
        </div>
        <div className={styles.meterRow}>
          <span>{percent === undefined ? '—' : formatTokens(Math.round(percent))}%</span>
          <span>{t('kpi.occupancySub')}</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Series definitions (shared by charts, tables and legends)           */
/* ------------------------------------------------------------------ */

const SERIES = [
  { key: 'cacheRead', cls: styles.segCacheRead },
  { key: 'input', cls: styles.segInput },
  { key: 'cacheWrite', cls: styles.segCacheWrite },
  { key: 'output', cls: styles.segOutput },
] as const

type SeriesKey = (typeof SERIES)[number]['key']

/** Map the chart series keys onto the UsageValue field names. */
const VALUE_OF: Record<SeriesKey, keyof UsageValue> = {
  input: 'inputTokens',
  cacheRead: 'cacheReadTokens',
  cacheWrite: 'cacheWriteTokens',
  output: 'outputTokens',
}

const CHART_W = 640

/** Round the max axis value up to a "nice" number (1/2/2.5/5/10 steps). */
function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const base = 10 ** exponent
  const normalized = value / base
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return step * base
}

/* ------------------------------------------------------------------ */
/* Composition donut                                                   */
/* ------------------------------------------------------------------ */

const DONUT_SIZE = 128

function Donut({ totals, t }: { readonly totals: UsageValue; readonly t: PropsLocale<'token-usage'>['t'] }) {
  const radius = DONUT_SIZE / 2 - 14
  const circumference = 2 * Math.PI * radius
  const center = DONUT_SIZE / 2
  const total = totalOf(totals)
  let offset = 0
  const arcs = SERIES.map((series) => {
    const value = totals[VALUE_OF[series.key]]
    const length = total > 0 ? (value / total) * circumference : 0
    const arc = { key: series.key, length, dashoffset: -offset }
    offset += length
    return arc
  })
  const arcClass: Record<SeriesKey, string> = {
    input: styles.arcInput,
    cacheRead: styles.arcCacheRead,
    cacheWrite: styles.arcCacheWrite,
    output: styles.arcOutput,
  }
  return (
    <div className={styles.donutBox}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        role="img"
        aria-label={t('breakdown.title')}
      >
        <circle className={styles.arcTrack} cx={center} cy={center} r={radius} fill="none" strokeWidth={13} />
        {arcs.map(arc => (
          <circle
            key={arc.key}
            className={`${styles.arc} ${arcClass[arc.key]}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={13}
            strokeDasharray={`${arc.length.toFixed(2)} ${(circumference - arc.length).toFixed(2)}`}
            strokeDashoffset={arc.dashoffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        <text className={styles.donutValue} x={center} y={center + 1} textAnchor="middle">{formatTokens(total)}</text>
        <text className={styles.donutCaption} x={center} y={center + 14} textAnchor="middle">{t('donut.caption')}</text>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Per-turn stacked bar chart with hover tooltip                       */
/* ------------------------------------------------------------------ */

const TURN_HEIGHT = 178
const TURN_PAD = { top: 14, right: 12, bottom: 20, left: 52 }

function TurnBarsChart({
  turns, t,
}: {
  readonly turns: readonly TokenUsageTurnRow[]
  readonly t: PropsLocale<'token-usage'>['t']
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const { innerWidth, innerHeight, barWidth, maxValue, segments, hits } = useMemo(() => {
    const innerWidth = Math.max(20, CHART_W - TURN_PAD.left - TURN_PAD.right)
    const innerHeight = TURN_HEIGHT - TURN_PAD.top - TURN_PAD.bottom
    const count = Math.max(1, turns.length)
    const slot = innerWidth / count
    const barWidth = Math.max(1.5, Math.min(26, slot - Math.min(5, slot * 0.3)))
    const peak = turns.reduce((max, turn) => Math.max(max, billedOf(turn.usage) + turn.usage.cacheReadTokens), 0)
    const maxValue = niceMax(peak)
    const scale = innerHeight / maxValue
    const segments: { key: SeriesKey; cls: string; x: number; y: number; width: number; height: number }[] = []
    const hits: { index: number; x: number; width: number }[] = []
    turns.forEach((turn, index) => {
      const centerX = TURN_PAD.left + slot * (index + 0.5)
      const x = centerX - barWidth / 2
      let cursor = TURN_PAD.top + innerHeight
      for (const series of SERIES) {
        const value = turn.usage[VALUE_OF[series.key]]
        const height = value > 0 ? Math.max(value * scale, 0.75) : 0
        cursor -= height
        segments.push({ key: series.key, cls: series.cls, x, y: cursor, width: barWidth, height })
      }
      hits.push({ index, x: TURN_PAD.left + slot * index, width: slot })
    })
    return { innerWidth, innerHeight, barWidth, maxValue, segments, hits }
  }, [turns])

  const ticks = [0, 0.5, 1].map(ratio => ({
    y: TURN_PAD.top + innerHeight * (1 - ratio),
    value: maxValue * ratio,
  }))
  const hoveredTurn = hovered === null ? undefined : turns[hovered]
  const tooltipLeft = hovered === null || hoveredTurn === undefined
    ? 0
    : (TURN_PAD.left + ((hovered + 0.5) * (innerWidth / Math.max(1, turns.length)))) / CHART_W * 100

  return (
    <div className={styles.chartBox}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${CHART_W} ${TURN_HEIGHT}`}
        width={CHART_W}
        height={TURN_HEIGHT}
        role="img"
        aria-label={t('chart.turns')}
      >
        {ticks.map(tick => (
          <g key={tick.value}>
            <line className={styles.grid} x1={TURN_PAD.left} y1={tick.y} x2={CHART_W - TURN_PAD.right} y2={tick.y} />
            <text className={styles.ytick} x={TURN_PAD.left - 6} y={tick.y + 3} textAnchor="end">
              {formatTokens(tick.value)}
            </text>
          </g>
        ))}
        <g className={styles.bars}>
          {segments.map((segment, index) => (
            <rect
              key={index}
              className={`${styles.seg} ${segment.cls}`}
              x={segment.x.toFixed(2)}
              y={segment.y.toFixed(2)}
              width={segment.width.toFixed(2)}
              height={Math.max(0, segment.height).toFixed(2)}
              rx={1}
            />
          ))}
        </g>
        {hits.map(hit => (
          <rect
            key={hit.index}
            className={styles.hit}
            x={hit.x}
            y={TURN_PAD.top}
            width={hit.width}
            height={innerHeight}
            onMouseEnter={() => setHovered(hit.index)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {hoveredTurn !== undefined && (
        <div
          className={`${styles.tooltip} ${styles.tooltipVisible}`}
          style={{ left: `clamp(64px, ${tooltipLeft}%, calc(100% - 64px))`, top: 2, transform: 'translateX(-50%)' }}
        >
          <div className={styles.tooltipHead}>{t('turns.turn')} {hoveredTurn.turn}</div>
          {SERIES.map(series => (
            <div key={series.key} className={styles.tooltipLine}>
              <span className={styles.muted}>
                <i className={`${styles.swatch} ${swatchClass[series.key]}`} />
                {t(`bucket.${series.key}` as never)}
              </span>
              <span>{formatTokens(hoveredTurn.usage[VALUE_OF[series.key]])}</span>
            </div>
          ))}
          <div className={styles.tooltipLine}>
            <span className={styles.muted}>{t('turns.calls')}</span>
            <span>{hoveredTurn.steps}</span>
          </div>
          {hoveredTurn.models.length > 0 && (
            <div className={styles.tooltipLine}>
              <span className={styles.muted}>{t('models.name')}</span>
              <span>{hoveredTurn.models.map(m => m.model).join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cumulative billed-tokens curve                                      */
/* ------------------------------------------------------------------ */

const CUM_HEIGHT = 118
const CUM_PAD = { top: 12, right: 12, bottom: 18, left: 52 }

function CumulativeChart({
  turns, t,
}: {
  readonly turns: readonly TokenUsageTurnRow[]
  readonly t: PropsLocale<'token-usage'>['t']
}) {
  const { line, area, last, maxValue } = useMemo(() => {
    const innerWidth = Math.max(20, CHART_W - CUM_PAD.left - CUM_PAD.right)
    const innerHeight = CUM_HEIGHT - CUM_PAD.top - CUM_PAD.bottom
    let running = 0
    const points = turns.map((turn, index) => {
      running += billedOf(turn.usage)
      const x = turns.length === 1 ? CUM_PAD.left + innerWidth : CUM_PAD.left + (innerWidth * index) / (turns.length - 1)
      return { x, value: running }
    })
    const maxValue = niceMax(running)
    const scale = innerHeight / maxValue
    const scaled = points.map(point => ({ ...point, y: CUM_PAD.top + innerHeight - point.value * scale }))
    const line = scaled.length === 0
      ? ''
      : scaled.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
    const area = scaled.length === 0
      ? ''
      : `${line} L${scaled[scaled.length - 1].x.toFixed(2)} ${CUM_PAD.top + innerHeight} L${scaled[0].x.toFixed(2)} ${CUM_PAD.top + innerHeight} Z`
    return { line, area, last: scaled[scaled.length - 1], maxValue }
  }, [turns])

  if (turns.length === 0) {
    return <div className={styles.chartEmpty}>{t('turns.empty')}</div>
  }
  const topY = CUM_PAD.top
  const bottomY = CUM_PAD.top + CUM_HEIGHT - CUM_PAD.top - CUM_PAD.bottom
  return (
    <div className={styles.chartBox}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${CHART_W} ${CUM_HEIGHT}`}
        width={CHART_W}
        height={CUM_HEIGHT}
        role="img"
        aria-label={t('chart.cumulative')}
      >
        <line className={styles.grid} x1={CUM_PAD.left} y1={topY} x2={CHART_W - CUM_PAD.right} y2={topY} />
        <line className={styles.grid} x1={CUM_PAD.left} y1={bottomY} x2={CHART_W - CUM_PAD.right} y2={bottomY} />
        <text className={styles.ytick} x={CUM_PAD.left - 6} y={topY + 4} textAnchor="end">{formatTokens(maxValue)}</text>
        <text className={styles.ytick} x={CUM_PAD.left - 6} y={bottomY + 3} textAnchor="end">0</text>
        <path className={styles.costArea} d={area} />
        <path className={styles.costLine} d={line} />
        {last !== undefined && <circle className={styles.tip} cx={last.x.toFixed(2)} cy={last.y.toFixed(2)} r={3.5} />}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Markdown report                                                     */
/* ------------------------------------------------------------------ */

function markdownOf(snapshot: TokenUsageSnapshot, wholeLabel: string): string {
  const lines = ['## Token Usage', '']
  lines.push(`- Total (incl. cache reads): ${formatTokens(totalOf(snapshot.totals))}`)
  lines.push(`- Billed (excl. cache reads): ${formatTokens(billedOf(snapshot.totals))}`)
  lines.push(`- Turns: ${snapshot.turns.length}`)
  lines.push('', '| Turn | Calls | Input | Cache read | Cache write | Output | Reasoning |', '|---|---|---|---|---|---|---|')
  for (const turn of snapshot.turns) {
    lines.push(`| ${turn.turn} | ${turn.steps} | ${formatTokens(turn.usage.inputTokens)} | ${formatTokens(turn.usage.cacheReadTokens)} | ${formatTokens(turn.usage.cacheWriteTokens)} | ${formatTokens(turn.usage.outputTokens)} | ${formatTokens(turn.usage.reasoningTokens)} |`)
  }
  lines.push('', `> ${wholeLabel}`)
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Breakdown buckets (shared by the breakdown table)                   */
/* ------------------------------------------------------------------ */

const BUCKETS = [
  { key: 'input', cls: styles.swatchInput },
  { key: 'cacheRead', cls: styles.swatchCacheRead },
  { key: 'cacheWrite', cls: styles.swatchCacheWrite },
  { key: 'output', cls: styles.swatchOutput },
] as const

const swatchClass: Record<SeriesKey, string> = {
  input: styles.swatchInput,
  cacheRead: styles.swatchCacheRead,
  cacheWrite: styles.swatchCacheWrite,
  output: styles.swatchOutput,
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function TokenUsageView({
  useSession, useProjection, loadOlder, t,
}: ConvViewProps & InjectFace<TokenUsageViewInjected> & PropsLocale<'token-usage'>) {
  useEffect(() => injectTokenUsageStyles(), [])
  const snapshot = useSession(s => s.views.get('tokenUsage') ?? EMPTY_TOKEN_USAGE_SNAPSHOT)
  const wholeLog = useProjection('tokenUsage')
  const pressure = useProjection('contextPressure')
  const stats = useProjection('sessionStats')
  const historyLoading = useSession(s => s.openState === 'loading')
  const olderLoading = useSession(s => s.loadingOlder)
  const hasOlder = useSession(s => s.hasMore)
  const [copied, setCopied] = useState(false)

  const models = useMemo(() => {
    const byLabel = new Map<string, { label: string; billed: number; calls: number }>()
    for (const node of snapshot.steps) {
      const data = node.data
      const label = data.provider === undefined || data.model === undefined
        ? 'unknown'
        : `${data.provider}/${data.model}`
      const previous = byLabel.get(label)
      byLabel.set(label, {
        label,
        billed: (previous?.billed ?? 0) + billedOf(data.usage),
        calls: (previous?.calls ?? 0) + 1,
      })
    }
    return [...byLabel.values()].sort((left, right) => right.billed - left.billed)
  }, [snapshot])

  const totals = wholeLog === undefined
    ? snapshot.totals
    : {
      inputTokens: wholeLog.uncachedInputTokens,
      outputTokens: wholeLog.outputTokens,
      cacheReadTokens: wholeLog.cacheReadTokens,
      cacheWriteTokens: wholeLog.cacheWriteTokens,
      reasoningTokens: 0,
    }
  const billed = billedOf(totals)
  const total = totalOf(totals)
  const hasAny = wholeLog !== undefined || snapshot.steps.length > 0

  const rawPercent = pressure?.projectedTokens !== undefined && pressure.contextWindow !== undefined
    && pressure.contextWindow > 0
    ? (pressure.projectedTokens / pressure.contextWindow) * 100
    : undefined
  const warn = rawPercent !== undefined && rawPercent >= 80
  const occupancyDetail = pressure?.projectedTokens !== undefined
    ? `${formatTokens(pressure.projectedTokens)} / ${pressure.contextWindow === undefined ? '—' : formatTokens(pressure.contextWindow)}`
    : undefined

  const copyReport = async (): Promise<void> => {
    await navigator.clipboard.writeText(markdownOf(snapshot, t('kpi.billed')))
    setCopied(true)
  }

  if (historyLoading) {
    return <div className={styles.center}>{t('actions.loadingOlder')}</div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={!hasAny || copied}
          onClick={() => { void copyReport() }}
        >
          {copied ? t('actions.copied') : t('actions.copy')}
        </button>
        {hasOlder && (
          <button
            type="button"
            className={styles.button}
            disabled={olderLoading}
            onClick={() => { void loadOlder() }}
          >
            {olderLoading ? t('actions.loadingOlder') : t('actions.loadOlder')}
          </button>
        )}
      </div>

      {!hasAny ? (
        <div className={styles.center}>
          <div className={styles.emptyIcon}>📊</div>
          <div className={styles.emptyTitle}>{t('empty.title')}</div>
          <div className={styles.emptyBody}>{t('empty.body')}</div>
        </div>
      ) : (
        <>
          <div className={styles.kpis}>
            <KpiCard label={t('kpi.total')} value={total} sub={t('kpi.totalSub')} kind="accent" t={t} />
            <KpiCard label={t('kpi.billed')} value={billed} sub={t('kpi.billedSub')} kind="output" t={t} />
            <KpiCard label={t('kpi.output')} value={totals.outputTokens} sub={t('kpi.outputSub')} t={t} />
            <KpiCard label={t('kpi.cacheRead')} value={totals.cacheReadTokens} sub={t('kpi.cacheReadSub')} kind="cache" t={t} />
          </div>

          <div className={styles.kpis}>
            <OccupancyKpi percent={rawPercent} detail={occupancyDetail} warn={warn} t={t} />
            <KpiCard label={t('kpi.turns')} value={stats === undefined ? '—' : stats.turns} t={t} />
            <KpiCard label={t('kpi.steps')} value={stats === undefined ? '—' : stats.steps} t={t} />
            <KpiCard label={t('kpi.reasoning')} value={totals.reasoningTokens} t={t} />
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {t('breakdown.title')}
              <span className={styles.sectionNote}>{t('breakdown.share')}</span>
            </h3>
            <div className={styles.donutRow}>
              <Donut totals={totals} t={t} />
              <div className={styles.legend}>
                {BUCKETS.map(bucket => (
                  <div key={bucket.key} className={styles.legendItem}>
                    <i className={`${styles.swatch} ${bucket.cls}`} />
                    <span>{t(`bucket.${bucket.key}` as never)}</span>
                    <span>
                      {formatTokens(totals[VALUE_OF[bucket.key]])}
                      <span className={styles.legendPct}> · {shareOf(totals[VALUE_OF[bucket.key]], billed)}</span>
                    </span>
                  </div>
                ))}
                <div key="reasoning" className={styles.legendItem}>
                  <i className={`${styles.swatch} ${styles.swatchReasoning}`} />
                  <span>{t('bucket.reasoning')}</span>
                  <span>
                    {formatTokens(totals.reasoningTokens)}
                    <span className={styles.legendPct}> · {shareOf(totals.reasoningTokens, billed)}</span>
                  </span>
                </div>
              </div>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('breakdown.bucket')}</th>
                  <th className={styles.num}>{t('breakdown.tokens')}</th>
                  <th className={styles.num}>{t('breakdown.share')}</th>
                </tr>
              </thead>
              <tbody>
                {BUCKETS.map(bucket => (
                  <tr key={bucket.key}>
                    <td>
                      <span className={styles.name}>
                        <i className={`${styles.swatch} ${bucket.cls}`} />
                        {t(`bucket.${bucket.key}` as never)}
                      </span>
                    </td>
                    <td className={styles.num}>{formatTokens(totals[VALUE_OF[bucket.key]])}</td>
                    <td className={`${styles.num} ${styles.shareCell}`}>
                      <span className={styles.share}>
                        <i style={{ width: `${billed <= 0 ? 0 : (totals[VALUE_OF[bucket.key]] / billed) * 100}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className={styles.subRow}>
                  <td>{t('bucket.reasoning')}</td>
                  <td className={styles.num}>{formatTokens(totals.reasoningTokens)}</td>
                  <td className={styles.num}>{shareOf(totals.reasoningTokens, billed)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {t('chart.turns')}
              <span className={styles.sectionNote}>{t('chart.turnsNote')}</span>
            </h3>
            {snapshot.turns.length === 0 ? (
              <div className={styles.chartEmpty}>{t('turns.empty')}</div>
            ) : (
              <>
                <TurnBarsChart turns={snapshot.turns} t={t} />
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('turns.turn')}</th>
                      <th>{t('turns.calls')}</th>
                      <th className={styles.num}>Input</th>
                      <th className={styles.num}>Cache R</th>
                      <th className={styles.num}>Cache W</th>
                      <th className={styles.num}>Output</th>
                      <th className={styles.num}>Reasoning</th>
                      <th>{t('models.name')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.turns.map(turn => (
                      <TurnRow key={turn.turn} turn={turn} t={t} />
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('chart.cumulative')}<span className={styles.sectionNote}>{t('chart.cumulativeNote')}</span></h3>
            <CumulativeChart turns={snapshot.turns} t={t} />
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('models.title')}</h3>
            {models.length === 0 ? (
              <div className={styles.muted}>{t('turns.empty')}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('models.name')}</th>
                    <th className={styles.num}>{t('models.tokens')}</th>
                    <th className={styles.num}>{t('models.calls')}</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map(model => (
                    <tr key={model.label}>
                      <td>{model.label === 'unknown' ? t('turns.unknownModel') : model.label}</td>
                      <td className={styles.num}>{formatTokens(model.billed)}</td>
                      <td className={styles.num}>{model.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function TurnRow({
  turn, t,
}: {
  readonly turn: TokenUsageTurnRow
  readonly t: PropsLocale<'token-usage'>['t']
}) {
  const segments = segmentsOf(turn.usage)
  const models = turn.models.length === 0
    ? t('turns.unknownModel')
    : turn.models.map(model => model.model).join(', ')
  return (
    <tr>
      <td>{turn.turn}</td>
      <td>{turn.steps}</td>
      <td className={styles.num}>{formatTokens(turn.usage.inputTokens)}</td>
      <td className={styles.num}>{formatTokens(turn.usage.cacheReadTokens)}</td>
      <td className={styles.num}>{formatTokens(turn.usage.cacheWriteTokens)}</td>
      <td className={styles.num}>{formatTokens(turn.usage.outputTokens)}</td>
      <td className={styles.num}>{formatTokens(turn.usage.reasoningTokens)}</td>
      <td>
        <div className={styles.bar} title={models}>
          {segments.map(segment => (
            <span
              key={segment.key}
              className={segment.key}
              style={{ width: segment.width }}
            />
          ))}
        </div>
      </td>
    </tr>
  )
}

/** Per-turn stacked bar segments (cache read / input / cache write / output). */
function segmentsOf(usage: UsageValue): readonly { readonly key: string; readonly width: string }[] {
  const total = totalOf(usage)
  if (total <= 0) return []
  const width = (value: number): string => `${(value / total) * 100}%`
  return [
    { key: styles.barCacheRead, width: width(usage.cacheReadTokens) },
    { key: styles.barInput, width: width(usage.inputTokens) },
    { key: styles.barCacheWrite, width: width(usage.cacheWriteTokens) },
    { key: styles.barOutput, width: width(usage.outputTokens) },
  ]
}
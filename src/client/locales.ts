/** `token-usage` namespace dictionaries (view tab label + panel strings). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'token-usage'

/** The token usage dictionary key set (the source of truth for both locales). */
export type TokenUsageKey =
  | 'view.tokenUsage'
  | 'empty.title'
  | 'empty.body'
  | 'kpi.total'
  | 'kpi.totalSub'
  | 'kpi.billed'
  | 'kpi.billedSub'
  | 'kpi.output'
  | 'kpi.outputSub'
  | 'kpi.cacheRead'
  | 'kpi.cacheReadSub'
  | 'kpi.occupancy'
  | 'kpi.occupancySub'
  | 'kpi.reasoning'
  | 'kpi.turns'
  | 'kpi.steps'
  | 'kpi.unknown'
  | 'breakdown.title'
  | 'breakdown.bucket'
  | 'breakdown.tokens'
  | 'breakdown.share'
  | 'donut.caption'
  | 'bucket.input'
  | 'bucket.cacheRead'
  | 'bucket.cacheWrite'
  | 'bucket.output'
  | 'bucket.reasoning'
  | 'models.title'
  | 'models.name'
  | 'models.tokens'
  | 'models.calls'
  | 'turns.title'
  | 'chart.turns'
  | 'chart.turnsNote'
  | 'chart.cumulative'
  | 'chart.cumulativeNote'
  | 'turns.turn'
  | 'turns.calls'
  | 'turns.unknownModel'
  | 'turns.empty'
  | 'actions.copy'
  | 'actions.copied'
  | 'actions.loadOlder'
  | 'actions.loadingOlder'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The token usage view tab label and panel strings. */
    'token-usage': TokenUsageKey
  }
}

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh: Record<TokenUsageKey, string> = {
  'view.tokenUsage': 'Token 用量',
  'empty.title': '暂无用量数据',
  'empty.body': '完成一轮对话后，这里会展示每次模型调用的 token 明细（输入 / 缓存 / 输出）与上下文占用。',
  'kpi.total': '总 token（含缓存）',
  'kpi.totalSub': '包含缓存读取',
  'kpi.billed': '计费 token（不含缓存读）',
  'kpi.billedSub': '不含缓存读取',
  'kpi.output': '输出 token',
  'kpi.outputSub': '含推理 token',
  'kpi.cacheRead': '缓存读取',
  'kpi.cacheReadSub': '命中提示缓存',
  'kpi.occupancy': '上下文占用',
  'kpi.occupancySub': '已用 / 窗口',
  'kpi.reasoning': '推理 token',
  'kpi.turns': '轮次',
  'kpi.steps': '步数',
  'kpi.unknown': '未知',
  'breakdown.title': '构成明细',
  'breakdown.bucket': '分项',
  'breakdown.tokens': 'token 数',
  'breakdown.share': '占比（按计费口径）',
  'donut.caption': 'token 合计',
  'bucket.input': '未缓存输入',
  'bucket.cacheRead': '缓存读取',
  'bucket.cacheWrite': '缓存写入',
  'bucket.output': '输出（含推理）',
  'bucket.reasoning': '其中推理',
  'models.title': '按模型拆分',
  'models.name': '模型',
  'models.tokens': '计费 token',
  'models.calls': '调用次数',
  'turns.title': '逐轮明细',
  'chart.turns': '每轮用量',
  'chart.turnsNote': '悬停查看明细',
  'chart.cumulative': '累计计费 token',
  'chart.cumulativeNote': '按调用顺序',
  'turns.turn': '轮',
  'turns.calls': '调用',
  'turns.unknownModel': '未知模型',
  'turns.empty': '（窗口内暂无带用量数据的调用）',
  'actions.copy': '复制 Markdown 报告',
  'actions.copied': '已复制',
  'actions.loadOlder': '加载更早记录',
  'actions.loadingOlder': '加载中…',
}

/** English dictionary. */
export const en: Record<TokenUsageKey, string> = {
  'view.tokenUsage': 'Token Usage',
  'empty.title': 'No usage data yet',
  'empty.body': 'After a turn completes, per-call token details (input / cache / output) and context occupancy appear here.',
  'kpi.total': 'Total tokens (incl. cache)',
  'kpi.totalSub': 'incl. cache reads',
  'kpi.billed': 'Billed tokens (excl. cache reads)',
  'kpi.billedSub': 'excl. cache reads',
  'kpi.output': 'Output tokens',
  'kpi.outputSub': 'incl. reasoning',
  'kpi.cacheRead': 'Cache reads',
  'kpi.cacheReadSub': 'prompt cache hits',
  'kpi.occupancy': 'Context occupancy',
  'kpi.occupancySub': 'used / window',
  'kpi.reasoning': 'Reasoning tokens',
  'kpi.turns': 'Turns',
  'kpi.steps': 'Steps',
  'kpi.unknown': 'Unknown',
  'breakdown.title': 'Breakdown',
  'breakdown.bucket': 'Bucket',
  'breakdown.tokens': 'Tokens',
  'breakdown.share': 'Share (billed base)',
  'donut.caption': 'tokens',
  'bucket.input': 'Uncached input',
  'bucket.cacheRead': 'Cache read',
  'bucket.cacheWrite': 'Cache write',
  'bucket.output': 'Output (incl. reasoning)',
  'bucket.reasoning': 'of which reasoning',
  'models.title': 'By model',
  'models.name': 'Model',
  'models.tokens': 'Billed tokens',
  'models.calls': 'Calls',
  'turns.title': 'Per turn',
  'chart.turns': 'Per-turn usage',
  'chart.turnsNote': 'hover for details',
  'chart.cumulative': 'Cumulative billed tokens',
  'chart.cumulativeNote': 'in call order',
  'turns.turn': 'Turn',
  'turns.calls': 'Calls',
  'turns.unknownModel': 'Unknown model',
  'turns.empty': '（No usage-bearing calls in the window.）',
  'actions.copy': 'Copy Markdown report',
  'actions.copied': 'Copied',
  'actions.loadOlder': 'Load older records',
  'actions.loadingOlder': 'Loading…',
}

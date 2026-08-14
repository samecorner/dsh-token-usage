import type { ConversationLocation, ConversationViewNode } from '@deepseek-ai/dsh-client-runtime/client'

/** One model call's normalized disjoint token accounting (cache fields default to zero). */
export interface UsageValue {
  /** Uncached prompt tokens. */
  readonly inputTokens: number
  /** Completion tokens; includes reasoning. */
  readonly outputTokens: number
  /** Prompt tokens served from the provider cache. */
  readonly cacheReadTokens: number
  /** Prompt tokens written into the provider cache. */
  readonly cacheWriteTokens: number
  /** Output tokens spent on reasoning; an output subdivision. */
  readonly reasoningTokens: number
}

/** Per-step usage fact folded from one `assistant/message` event. */
export interface TokenUsageStepNode extends ConversationViewNode {
  readonly target: 'tokenUsage'
  readonly anchorSeq: number
  readonly location: ConversationLocation
  readonly data: {
    readonly kind: 'token-usage-step'
    readonly turn: number
    readonly step: number
    readonly seq: number
    readonly time: number
    readonly usage: UsageValue
    readonly provider: string | undefined
    readonly model: string | undefined
  }
}

/** One turn's aggregated usage rows, in first-appearance order. */
export interface TokenUsageTurnRow {
  readonly turn: number
  readonly steps: number
  readonly usage: UsageValue
  readonly models: readonly { readonly provider: string; readonly model: string }[]
}

/** Per-window token usage facts assembled for the Token Usage view. */
export interface TokenUsageSnapshot {
  readonly steps: readonly TokenUsageStepNode[]
  readonly turns: readonly TokenUsageTurnRow[]
  readonly totals: UsageValue
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationViewSnapshotMap {
    /** Per-step usage facts consumed by the Token Usage view. */
    tokenUsage: TokenUsageSnapshot
  }
}

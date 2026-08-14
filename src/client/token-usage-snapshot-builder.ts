import type { Context } from '@deepseek-ai/cordis'
import type {
  ConversationViewBuilder, ConversationViewDefinition,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  TokenUsageSnapshot, TokenUsageStepNode, TokenUsageTurnRow, UsageValue,
} from './token-usage-contract.ts'

const EMPTY_LIST: readonly never[] = []

/** Stable empty snapshot until a Session has assembled Token Usage records. */
export const EMPTY_TOKEN_USAGE_SNAPSHOT: TokenUsageSnapshot = {
  steps: EMPTY_LIST,
  turns: EMPTY_LIST,
  totals: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 },
}

function addUsage(current: UsageValue, next: UsageValue): UsageValue {
  return {
    inputTokens: current.inputTokens + next.inputTokens,
    outputTokens: current.outputTokens + next.outputTokens,
    cacheReadTokens: current.cacheReadTokens + next.cacheReadTokens,
    cacheWriteTokens: current.cacheWriteTokens + next.cacheWriteTokens,
    reasoningTokens: current.reasoningTokens + next.reasoningTokens,
  }
}

function turnOf(step: TokenUsageStepNode): TokenUsageTurnRow {
  const data = step.data
  return {
    turn: data.turn,
    steps: 1,
    usage: data.usage,
    models: data.model === undefined || data.provider === undefined
      ? EMPTY_LIST
      : [{ provider: data.provider, model: data.model }],
  }
}

function mergeTurn(current: TokenUsageTurnRow, step: TokenUsageStepNode): TokenUsageTurnRow {
  const data = step.data
  const known = current.models.some(
    row => row.model === data.model && row.provider === data.provider,
  )
  return {
    ...current,
    steps: current.steps + 1,
    usage: addUsage(current.usage, data.usage),
    ...(known || data.model === undefined || data.provider === undefined
      ? {}
      : { models: [...current.models, { provider: data.provider, model: data.model }] }),
  }
}

/** Fold the window's per-step usage nodes into ordered turn rows and totals. */
function snapshotOf(nodes: readonly TokenUsageStepNode[]): TokenUsageSnapshot {
  const turns: TokenUsageTurnRow[] = []
  let totals: UsageValue = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
  }
  for (const node of nodes) {
    totals = addUsage(totals, node.data.usage)
    const previous = turns.at(-1)
    if (previous !== undefined && previous.turn === node.data.turn) {
      turns[turns.length - 1] = mergeTurn(previous, node)
    } else {
      turns.push(turnOf(node))
    }
  }
  return { steps: nodes, turns, totals }
}

/** Simple keyed adapter retaining the Token Usage snapshot across window updates. */
class TokenUsageSnapshotBuilder implements ConversationViewBuilder<
  TokenUsageStepNode,
  TokenUsageSnapshot
> {
  private readonly nodes = new Map<string, TokenUsageStepNode>()
  readonly empty = EMPTY_TOKEN_USAGE_SNAPSHOT

  replace(input: { readonly nodes: readonly TokenUsageStepNode[] }): TokenUsageSnapshot {
    this.nodes.clear()
    for (const node of input.nodes) this.nodes.set(node.key, node)
    return this.snapshot()
  }

  apply(input: { readonly upserts: readonly TokenUsageStepNode[] }): TokenUsageSnapshot {
    for (const node of input.upserts) this.nodes.set(node.key, node)
    return this.snapshot()
  }

  private snapshot(): TokenUsageSnapshot {
    return snapshotOf([...this.nodes.values()].sort(
      (left, right) => left.anchorSeq - right.anchorSeq,
    ))
  }
}

/** Token Usage target factory. */
export const tokenUsageViewDefinition: ConversationViewDefinition<
  TokenUsageStepNode,
  TokenUsageSnapshot
> = {
  target: 'tokenUsage',
  create: () => new TokenUsageSnapshotBuilder(),
}

/**
 * Register the Token Usage target builder.
 *
 * @param ctx - Plugin context receiving the view Definition.
 */
export function registerTokenUsageConversationView(ctx: Context): void {
  ctx.conversationViews.register(tokenUsageViewDefinition)
}

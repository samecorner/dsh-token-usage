import type { Context } from '@deepseek-ai/cordis'
import type {
  ConversationMatch, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import type { TokenUsageStepNode, UsageValue } from './token-usage-contract.ts'

/** Fold state: the assembled message's normalized usage plus its route identity. */
interface TokenUsageStepState {
  readonly turn: number
  readonly step: number
  readonly seq: number
  readonly time: number
  readonly usage: UsageValue
  readonly provider: string | undefined
  readonly model: string | undefined
}

/** Normalize one provider usage record into the view's disjoint zero-based buckets. */
function normalizeUsage(usage: TokenUsage): UsageValue {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteTokens ?? 0,
    reasoningTokens: usage.reasoningTokens ?? 0,
  }
}

function stateOf(
  context: ConversationNodeContext<TokenUsageStepState>,
  match: ConversationMatch,
): TokenUsageStepState {
  if (match.event.type !== 'assistant/message' || match.event.data.usage === undefined) {
    throw new Error('token-usage-step start requires an assistant/message event with usage')
  }
  const message = match.event.data.message
  return {
    turn: match.event.data.turn,
    step: match.event.data.step,
    seq: match.event.seq,
    time: match.event.time,
    usage: normalizeUsage(match.event.data.usage),
    provider: message.source.provider,
    model: message.source.model,
  }
}

/** Wrap the fold state as the target-owned view node. */
function wrap(
  context: ConversationNodeContext<TokenUsageStepState>,
  state: TokenUsageStepState,
): TokenUsageStepNode {
  return {
    key: context.key,
    kind: context.kind,
    id: context.id,
    target: 'tokenUsage',
    anchorSeq: state.seq,
    location: context.start?.location ?? { kind: 'unresolved' },
    data: {
      kind: 'token-usage-step',
      turn: state.turn,
      step: state.step,
      seq: state.seq,
      time: state.time,
      usage: state.usage,
      provider: state.provider,
      model: state.model,
    },
  }
}

/**
 * Token-usage-owned Assistant accounting definition: one node per
 * `assistant/message` event carrying provider usage. A later message for the
 * same `(turn, step)` (a retried call) replaces the earlier sample — the
 * same last-wins rule the host `tokenUsage` projection applies — so a
 * cancelled attempt never double-counts.
 */
const tokenUsageStepDefinition: ConversationNodeDefinition<TokenUsageStepState> = {
  kind: 'token-usage-step',
  target: 'tokenUsage',
  match: event => event.type === 'assistant/message' && event.data.usage !== undefined
    ? { id: `${event.data.turn}:${event.data.step}`, role: 'start' }
    : null,
  start: (context, match) => stateOf(context, match),
  update: (context, match) => {
    if (match.event.type !== 'assistant/message' || match.event.data.usage === undefined) {
      return context.state
    }
    const message = match.event.data.message
    return {
      ...context.state,
      seq: match.event.seq,
      time: match.event.time,
      usage: normalizeUsage(match.event.data.usage),
      provider: message.source.provider,
      model: message.source.model,
    }
  },
  buildViewNode: (context) => {
    const state = context.state
    return state === undefined ? null : wrap(context, state)
  },
}

/**
 * Register the Token Usage Assistant accounting definition.
 *
 * @param ctx - Plugin context receiving the Definition.
 */
export function registerTokenUsageStepDefinition(ctx: Context): void {
  ctx.conversationEvents.register(tokenUsageStepDefinition)
}

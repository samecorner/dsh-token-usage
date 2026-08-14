/**
 * Browser token usage plugin: one conversation view tab folding per-step
 * provider usage into KPI cards, a breakdown table, a per-model split, and a
 * per-turn ledger, with whole-log figures from the host projections.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the 'conversation.view' SlotMap row (declared by the slot's
// owning package) must be in the program for the register calls to type.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { en, NS, zh } from './locales.ts'
import { registerTokenUsageConversationView } from './token-usage-snapshot-builder.ts'
import { registerTokenUsageStepDefinition } from './token-usage-step-definition.ts'
import { TokenUsageView, type TokenUsageViewInjected } from './TokenUsageView.tsx'

/** Required services: the conversation slot, registries, ordinary Session paging, and the locale service. */
export const inject = ['slots', 'conversationEvents', 'conversationViews', 'sessions', 'locale']

/**
 * Client plugin body: register the token usage view tab. The registration
 * rides the slot service's effect wrapper, so plugin unload removes the tab.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-token-usage: dictionaries')
  const t = ctx.locale.bind(NS)
  registerTokenUsageStepDefinition(ctx)
  registerTokenUsageConversationView(ctx)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'token-usage',
    order: 20,
    locale: NS,
    label: () => t('view.tokenUsage'),
    inject: (sessionId: SessionId): TokenUsageViewInjected => {
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) {
        throw new Error(`ui-token-usage: session "${sessionId}" is unavailable`)
      }
      return {
        loadOlder: async () => {
          const before = session.getSnapshot().views.get('tokenUsage')
          await session.loadOlder()
          return session.getSnapshot().views.get('tokenUsage') !== before
        },
      }
    },
  }, TokenUsageView))
}

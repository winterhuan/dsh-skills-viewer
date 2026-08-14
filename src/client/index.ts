/**
 * Skills viewer settings plugin, browser half. Registers the Skills page in
 * the Settings panel, fetching the current session's user-invocable skill
 * catalog through the existing `skill.list` wire RPC. The page is read-only
 * and session-scoped: discovery depends on composition, cwd, and preset
 * layer, so it refetches when the current session changes.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { SkillsSection } from './SkillsSection.tsx'
import type { SkillsSectionInjected } from './SkillsSection.tsx'
import { en, zh, NS, type SkillsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Skills settings page copy. */
    'settings.skills': SkillsKey
  }
}

/**
 * Required services (cordis fiber inject). The target slot is declared by
 * ui-settings' apply, whose activation order relative to this one is NOT
 * constrained; registration depends on each slot through `slots.inject()`.
 */
export const inject = ['slots', 'locale', 'connection']

/**
 * Register the Skills section once the `settings.section` declaration is on
 * the ledger, and wire its store to the connection.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-skills-viewer: copy dictionaries')

  const connection = ctx.get('connection') as ConnectionHandle
  const t = ctx.locale.bind(NS) as SkillsSectionInjected['t']
  const injected = (): SkillsSectionInjected => ({
    api: connection.api,
    t,
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skills',
    order: 90,
    label: () => t('nav'),
    inject: injected,
  }, SkillsSection))
}

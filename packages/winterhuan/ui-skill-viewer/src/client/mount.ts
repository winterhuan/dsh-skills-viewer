/**
 * Source-safe lifecycle of the skill viewer browser half: registers the sidebar-foot action that
 * opens the viewer panel — the skill list with source metadata plus
 * on-demand full instructions, read from the `skillViewer` Remote over the
 * plugin's root-context connection captured at registration.
 *
 * List and body fetches cache per session (the small twin of the ui-skill
 * directory): opening the panel replays the settled snapshot locally, so
 * one session costs one list RPC. A preset switch drops that session's
 * entries (the catalog belongs to the preset); connection/reset clears
 * everything. Catalog addressing matches the slash source: continuable
 * subagent children resolve no skills locally because the RPC requires an
 * attached session.
 */

// Type-only: the carrier types, the forwarded Host-event face and the ctx.remote merge.
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent-preset-registry/types'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the session-controller's Context merge (ctx.sessions).
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@winterhuan/dsh-skill-viewer/remote'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { SkillViewerController } from './controller.ts'
import { SkillViewerAction } from './SkillViewerAction.tsx'
import { en, NS, zh, type SkillViewerKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The skill viewer panel copy. */
    skillViewer: SkillViewerKey
  }
}

/** Required services before the `skillViewer` Remote mounts. */
export const inject = ['slots', 'locale', 'remote', 'sessions']

/**
 * Mount the plugin's own Remote namespace, since `dsh-api-remotes` lists only harness namespaces.
 * @param ctx - client root context.
 * @param contribution - generated `skillViewer` Remote definitions.
 * @returns disposer joining UI and Remote withdrawal.
 */
export async function mountSkillViewer(ctx: ClientContext, contribution: TypertRemoteContribution): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(contribution)
  const ui = ctx.inject(['slots', 'locale', 'remote', 'remote.skillViewer', 'sessions'], registerUi)
  try { await ui } catch (error) { await ui.dispose(); await disposeRemote(); throw error }
  return async () => { await ui.dispose(); await disposeRemote() }
}

function registerUi(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-skill-viewer: dictionaries')

  const controller = new SkillViewerController(ctx.remote.skillViewer, ctx.sessions)
  ctx.effect(() => () => { controller.dispose() }, 'ui-skill-viewer: controller')

  // A preset decides which skills an agent reads, so a switched session's
  // cached entries belong to the composition it no longer runs.
  const invalidate = (sessionId: SessionId): void => { controller.invalidate(sessionId) }
  ctx.remote.$on('agent-preset/selected', invalidate)
  ctx.on('connection/reset', () => { controller.invalidate() })

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'skill-viewer',
    locale: NS,
    inject: () => ({
      controller,
      hooks: { viewer: controller.store },
    }),
  }, SkillViewerAction))
}

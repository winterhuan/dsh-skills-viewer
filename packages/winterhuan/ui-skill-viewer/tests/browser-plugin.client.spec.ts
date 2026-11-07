/**
 * ui-skill-viewer plugin halves: the browser entry's dictionary, foot-slot,
 * and invalidation registrations against a real cordis Context (with fiber
 * teardown proving removal — HMR safety), and the inert node entry.
 */
import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SkillViewerEntry, SkillViewerGetValue } from '@winterhuan/dsh-skill-viewer/types'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { inject, mountSkillViewer } from '../src/client/mount.ts'

const skillViewerRemote: TypertRemoteContribution = { package: '@winterhuan/dsh-skill-viewer', descriptors: [] }
const apply = (ctx: Context): Promise<() => Promise<void>> => mountSkillViewer(ctx, skillViewerRemote)
import { apply as applyNode } from '../src/index.ts'
import { en, NS, zh } from '../src/client/locales.ts'

const A = 's-a' as SessionId

/** The one row shape the viewer's minimal sessions face reads. */
type SessionsSnapshot = {
  readonly byId: Readonly<Record<SessionId, {
    readonly id: SessionId
    readonly retainedBy: Readonly<Record<string, number | undefined>>
  }>>
}

function entry(overrides: Partial<SkillViewerEntry> = {}): SkillViewerEntry {
  return {
    name: 'review',
    description: 'Review the current change.',
    modelInvocable: true,
    userInvocable: true,
    source: 'project-dsh',
    provider: 'filesystem',
    ...overrides,
  }
}

function detail(): SkillViewerGetValue {
  return {
    name: 'review',
    description: 'Review the current change.',
    modelInvocable: true,
    userInvocable: true,
    source: 'project-dsh',
    provider: 'filesystem',
    content: '# Review',
    references: { files: [], truncated: false },
  }
}

/** Boot the browser half over fake remote/sessions faces; every read is recorded. */
async function bench() {
  const ctx = new Context()
  const calls: { method: string; request: unknown }[] = []
  const presetHandlers: Array<(sessionId: SessionId) => void> = []
  const onPresetSelected = (event: string, handler: (sessionId: SessionId) => void): (() => void) => {
    if (event === 'agent-preset/selected') presetHandlers.push(handler)
    return () => {}
  }
  const remote = {
    listDetails: (request: unknown) => {
      calls.push({ method: 'listDetails', request })
      return Promise.resolve({ ok: true as const, value: { skills: [entry()], stale: false } })
    },
    get: (request: unknown) => {
      calls.push({ method: 'get', request })
      return Promise.resolve({ ok: true as const, value: detail() })
    },
    readReference: () => Promise.resolve({ ok: true as const, value: { path: 'references/guide.md', content: '# Guide', bytes: 7, truncated: false } }),
  }
  const mounted: string[] = []
  class RemoteService extends Service {
    $on = onPresetSelected

    constructor(serviceCtx: Context) {
      super(serviceCtx, 'remote')
    }

    $mount(contribution: TypertRemoteContribution): Promise<() => Promise<void>> {
      mounted.push(contribution.package)
      const dispose = ctx.provide('remote.skillViewer', remote)
      return Promise.resolve(() => { dispose(); return Promise.resolve() })
    }
  }
  new RemoteService(ctx)

  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)

  ctx.provide('locale', new LocaleRuntime(ctx))

  let current: SessionId | undefined = A
  const listeners = new Set<() => void>()
  const shown = (id: SessionId | undefined): SessionsSnapshot => id === undefined
    ? { byId: {} }
    : { byId: { [id]: { id, retainedBy: { mainView: 1 } } } }
  ctx.provide('sessions', {
    list: {
      getSnapshot: () => shown(current),
      subscribe: (listener: () => void): (() => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    },
    subagentAddress: (): unknown => undefined,
  })

  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return {
    ctx,
    fiber,
    calls,
    mounted,
    presetHandlers,
    switchSession(next: SessionId | undefined): void {
      current = next
      for (const listener of listeners) listener()
    },
    controller() {
      const registered = ctx.slots.entries('sidebar.footer.action')[0]
      if (registered === undefined) return undefined
      const face = (registered.inject as () => { controller: import('../src/client/controller.ts').SkillViewerController })()
      return face.controller
    },
  }
}

describe('ui-skill-viewer browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote', 'sessions'])
  })

  it('mounts its own skillViewer Remote namespace', async () => {
    const b = await bench()
    expect(b.mounted).toEqual(['@winterhuan/dsh-skill-viewer'])
  })

  it('registers the foot action, and fiber teardown removes it (HMR safety)', async () => {
    const b = await bench()
    expect(b.ctx.slots.entries('sidebar.footer.action').map(row => row.options.id)).toContain('skill-viewer')

    await b.fiber.dispose()
    expect(b.ctx.slots.entries('sidebar.footer.action')).toHaveLength(0)
  })

  it('re-registers cleanly when the plugin is reloaded', async () => {
    const b = await bench()
    await b.fiber.dispose()

    const reloaded = b.ctx.plugin({ inject: [...inject], apply })
    await reloaded.await()

    expect(b.ctx.slots.entries('sidebar.footer.action').map(row => row.options.id)).toEqual(['skill-viewer'])
  })

  it('registers both dictionaries under its own namespace', async () => {
    const b = await bench()
    const translate = b.ctx.locale.bind(NS)
    // This lane has no jsdom window, so language detection never runs and the
    // locale falls back to en: state the asserted locale explicitly.
    b.ctx.locale.setLocale('zh')
    expect(translate('action.label')).toBe(zh['action.label'])
    b.ctx.locale.setLocale('en')
    expect(translate('action.label')).toBe(en['action.label'])
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('follows session changes while the panel is open', async () => {
    const b = await bench()
    const controller = b.controller()!
    controller.open()
    await Promise.resolve()

    b.switchSession('s-b' as SessionId)
    await Promise.resolve()

    expect(b.calls.filter(call => call.method === 'listDetails').map(call => call.request)).toEqual([
      { sessionId: A },
      { sessionId: 's-b' },
    ])
  })

  it('drops the session catalog when its preset switches', async () => {
    const b = await bench()
    const controller = b.controller()!
    controller.open()
    await Promise.resolve()
    controller.close()
    expect(b.calls).toHaveLength(1)

    expect(b.presetHandlers).toHaveLength(1)
    b.presetHandlers[0]!(A)
    controller.open()
    await Promise.resolve()

    expect(b.calls.filter(call => call.method === 'listDetails')).toHaveLength(2)
  })

  it('reloads the open panel when the connection resets', async () => {
    const b = await bench()
    const controller = b.controller()!
    controller.open()
    await Promise.resolve()
    expect(b.calls).toHaveLength(1)

    b.ctx.emit('connection/reset')
    await Promise.resolve()

    expect(b.calls.filter(call => call.method === 'listDetails')).toHaveLength(2)
  })

  it('stays quiet on session changes while the panel is closed', async () => {
    const b = await bench()
    const controller = b.controller()!
    controller.open()
    await Promise.resolve()
    controller.close()
    expect(b.calls).toHaveLength(1)

    b.switchSession('s-b' as SessionId)
    await Promise.resolve()

    expect(b.calls).toHaveLength(1)
  })
})

describe('ui-skill-viewer node half', () => {
  it('contributes no host behavior', () => {
    // The node half exists only so the plugin appears in the Loader tree.
    expect(applyNode).not.toThrow()
  })
})

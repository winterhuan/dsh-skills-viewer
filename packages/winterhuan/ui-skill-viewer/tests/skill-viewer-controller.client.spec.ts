/**
 * SkillViewerController: the panel's viewing state plus the session-keyed
 * catalog cache over the `skillViewer` Remote. These specs pin the single-flight
 * caching contract — one settled list RPC per session replays locally, a
 * failed fetch never poisons its key, mid-flight session switches never paint
 * a stale session's data, and every cache entry belongs to the composition
 * that produced it.
 */
import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SkillViewerEntry, SkillViewerGetValue, SkillViewerListValue } from '@winterhuan/dsh-skill-viewer/types'
import { searchSkills, SkillViewerController, type SkillViewerRemote } from '../src/client/controller.ts'

const A = 's-a' as SessionId
const B = 's-b' as SessionId
const CHILD = 's-child' as SessionId

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

function detail(overrides: Partial<SkillViewerGetValue> = {}): SkillViewerGetValue {
  return {
    name: 'review',
    description: 'Review the current change.',
    modelInvocable: true,
    userInvocable: true,
    source: 'project-dsh',
    provider: 'filesystem',
    content: '# Review',
    references: { files: ['references/guide.md'], truncated: false },
    ...overrides,
  }
}

function listValue(overrides: Partial<SkillViewerListValue> = {}): SkillViewerListValue {
  return { skills: [entry()], stale: false, ...overrides }
}

type Script = {
  listDetails?: (request: unknown, signal: AbortSignal) => Promise<unknown>
  get?: (request: unknown, signal: AbortSignal) => Promise<unknown>
  readReference?: (request: unknown, signal: AbortSignal) => Promise<unknown>
}

/** A recording fake Remote; scripts return the business value or a carrier failure. */
function fakeRemote(script: Script = {}) {
  const calls: { method: string; request: unknown }[] = []
  const isFailure = (v: unknown): boolean =>
    typeof v === 'object' && v !== null && 'ok' in v && !(v as { ok: boolean }).ok
  const record = (method: 'listDetails' | 'get' | 'readReference', real: Script['listDetails'], fallback: unknown) =>
    (request: never, signal: AbortSignal): Promise<never> => {
      calls.push({ method, request })
      const business = real === undefined ? Promise.resolve(fallback) : real(request, signal)
      return business.then(v => (isFailure(v) ? v : { ok: true, value: v })) as Promise<never>
    }
  const remote: SkillViewerRemote = {
    listDetails: record('listDetails', script.listDetails, listValue()),
    get: record('get', script.get, detail()),
    readReference: record('readReference', script.readReference, { path: 'references/guide.md', content: '# Guide', bytes: 7, truncated: false }),
  }
  return { remote, calls }
}

/** The one row shape the viewer's minimal sessions face reads. */
type FakeRow = { readonly id: SessionId; readonly retainedBy: Readonly<Record<string, number | undefined>> }

function fakeSessions(current: SessionId | undefined) {
  const children = new Set<SessionId>([CHILD])
  const shown = (id: SessionId): { readonly byId: Readonly<Record<SessionId, FakeRow>> } =>
    ({ byId: { [id]: { id, retainedBy: { mainView: 1 } } } })
  let snapshot = current === undefined ? { byId: {} } : shown(current)
  const listeners = new Set<() => void>()
  return {
    sessions: {
      list: {
        getSnapshot: (): { readonly byId: Readonly<Record<SessionId, FakeRow>> } => snapshot,
        subscribe: (listener: () => void): (() => void) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
      },
      subagentAddress: (sessionId: SessionId): unknown => children.has(sessionId) ? { child: sessionId } : undefined,
    },
    switchTo(next: SessionId | undefined, notify = true): void {
      snapshot = next === undefined ? { byId: {} } : shown(next)
      if (notify) for (const listener of listeners) listener()
    },
  }
}

/** Let the controller's settlement microtasks drain. */
const settle = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0) })

async function ready(remote: SkillViewerRemote, sessionId: SessionId = A): Promise<SkillViewerController> {
  const controller = new SkillViewerController(remote, fakeSessions(sessionId).sessions)
  controller.open()
  await settle()
  return controller
}

describe('SkillViewerController addressing', () => {
  it('ranks names before description, usage and origin matches without duplicating entries', () => {
    const skills = [entry({ name: 'beta', description: 'Publishing guide' }), entry({ name: 'publish', source: 'publishing' }),
      entry({ name: 'gamma', whenToUse: 'Before publishing' }), entry({ name: 'delta', provider: 'publisher' })]
    expect(searchSkills(skills, ' PUBLI ').map(skill => skill.name)).toEqual(['publish', 'beta', 'gamma', 'delta'])
    expect(searchSkills(skills, 'project-dsh')).toHaveLength(3)
    expect(searchSkills(skills, '')).toEqual(skills)
  })

  it('selects the first matching skill when the catalog opens', async () => {
    const { remote } = fakeRemote({
      listDetails: () => Promise.resolve(listValue({ skills: [entry({ name: 'alpha' }), entry({ name: 'review' })] })),
    })
    const controller = new SkillViewerController(remote, fakeSessions(A).sessions)
    controller.setQuery('review')
    controller.open()
    await settle()
    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'ready' })
  })

  it('does not request a body for an empty catalog or after closing before it loads', async () => {
    const empty = fakeRemote({ listDetails: () => Promise.resolve(listValue({ skills: [] })) })
    const emptyController = await ready(empty.remote)
    expect(emptyController.store.getSnapshot().detail).toBeNull()
    expect(empty.calls.map(call => call.method)).toEqual(['listDetails'])
    let release!: (value: SkillViewerListValue) => void
    const pending = fakeRemote({ listDetails: () => new Promise((resolve) => { release = resolve }) })
    const controller = new SkillViewerController(pending.remote, fakeSessions(A).sessions)
    controller.open()
    controller.close()
    release(listValue())
    await settle()
    expect(pending.calls.map(call => call.method)).toEqual(['listDetails'])
  })

  it('reports an unscoped blank view without touching the Remote', async () => {
    const { remote, calls } = fakeRemote()
    const controller = new SkillViewerController(remote, fakeSessions(undefined).sessions)

    controller.open()
    await settle()

    expect(controller.store.getSnapshot()).toMatchObject({
      open: true, status: 'ready', scoped: false, skills: [],
    })
    expect(calls).toEqual([])
  })

  it('treats a continuable subagent child as unaddressable', async () => {
    const { remote, calls } = fakeRemote()
    const controller = new SkillViewerController(remote, fakeSessions(CHILD).sessions)

    controller.open()
    await settle()

    expect(controller.store.getSnapshot().scoped).toBe(false)
    expect(calls).toEqual([])
  })

  it('addresses the Session the main view retains rather than merely a listed one', async () => {
    const { remote, calls } = fakeRemote()
    const controller = new SkillViewerController(remote, {
      list: {
        // The unretained row sorts first, so a list-order read would address the wrong Session.
        getSnapshot: () => ({
          byId: {
            [A]: { id: A, retainedBy: {} },
            [B]: { id: B, retainedBy: { mainView: 1 } },
          },
        }),
        subscribe: () => () => {},
      },
      subagentAddress: () => undefined,
    })

    controller.open()
    await settle()

    expect(controller.store.getSnapshot()).toMatchObject({ status: 'ready', scoped: true })
    expect(calls).toEqual([
      { method: 'listDetails', request: { sessionId: B } },
      { method: 'get', request: { sessionId: B, name: 'review' } },
    ])
  })

  it('loads the catalog for the addressable session and paints ready', async () => {
    const { remote, calls } = fakeRemote({
      listDetails: request => Promise.resolve(
        (request as { sessionId: SessionId }).sessionId === A ? listValue({ stale: true }) : listValue(),
      ),
    })
    const controller = new SkillViewerController(remote, fakeSessions(A).sessions)

    controller.open()
    await settle()

    expect(controller.store.getSnapshot()).toMatchObject({
      open: true, status: 'ready', scoped: true, stale: true,
      skills: [{ name: 'review' }],
    })
    expect(calls).toEqual([
      { method: 'listDetails', request: { sessionId: A } },
      { method: 'get', request: { sessionId: A, name: 'review' } },
    ])
    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'ready' })
  })
})

describe('SkillViewerController caching', () => {
  it('replays the settled snapshot on reopen without a second read', async () => {
    const { remote, calls } = fakeRemote()
    const controller = await ready(remote)

    controller.close()
    controller.open()
    await settle()

    expect(controller.store.getSnapshot().status).toBe('ready')
    expect(calls).toHaveLength(2)
  })

  it('replays the settled body on reselect without a second read', async () => {
    const { remote, calls } = fakeRemote()
    const controller = await ready(remote)

    controller.select('review')
    await settle()
    controller.back()
    controller.select('review')
    await settle()

    expect(controller.store.getSnapshot().detail).toMatchObject({
      status: 'ready', value: { content: '# Review' },
    })
    expect(calls.filter(call => call.method === 'get')).toHaveLength(1)
  })

  it('keeps separate sessions on separate catalog caches', async () => {
    const { remote, calls } = fakeRemote()
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()

    holder.switchTo(B)
    controller.open()
    await settle()

    expect(calls.filter(call => call.method === 'listDetails').map(call => call.request)).toEqual([{ sessionId: A }, { sessionId: B }])
  })
})

describe('SkillViewerController failures', () => {
  it('retains the catalog and selected body after a failed refresh, then removes a vanished selection', async () => {
    let listing: 'ready' | 'failed' | 'empty' = 'ready'
    const { remote } = fakeRemote({ listDetails: () => listing === 'failed' ? Promise.reject(new Error('offline'))
      : Promise.resolve(listValue({ skills: listing === 'empty' ? [] : [entry()] })) })
    const controller = await ready(remote)
    try {
      listing = 'failed'
      controller.retry()
      await settle()
      expect(controller.store.getSnapshot()).toMatchObject({ status: 'error', skills: [entry()], detail: { name: 'review', status: 'ready' } })
      listing = 'empty'
      controller.retry()
      await settle()
      expect(controller.store.getSnapshot()).toMatchObject({ status: 'ready', skills: [], detail: null })
    } finally { controller.dispose() }
  })

  it('surfaces a failed read and lets the next open retry', async () => {
    let failing = true
    const { remote, calls } = fakeRemote({
      listDetails: () => failing
        ? Promise.resolve({ ok: false, error: { code: 'gateway/internal', message: 'offline', details: {} } })
        : Promise.resolve(listValue()),
    })
    const controller = new SkillViewerController(remote, fakeSessions(A).sessions)

    controller.open()
    await settle()
    expect(controller.store.getSnapshot()).toMatchObject({
      status: 'error', error: 'skillViewer/listDetails failed: gateway/internal: offline',
    })

    failing = false
    controller.open()
    await settle()
    expect(controller.store.getSnapshot().status).toBe('ready')
    expect(calls).toHaveLength(3)
  })

  it('surfaces a failed body load and lets a reselect retry', async () => {
    let failing = true
    const { remote } = fakeRemote({
      get: () => failing
        ? Promise.resolve({ ok: false, error: { code: 'skillViewer/unknown-skill', message: 'gone', details: {} } })
        : Promise.resolve(detail()),
    })
    const controller = await ready(remote)

    controller.select('review')
    await settle()
    expect(controller.store.getSnapshot().detail).toMatchObject({
      status: 'error',
      error: 'skillViewer/get failed: skillViewer/unknown-skill: gone',
    })

    failing = false
    controller.select('review')
    await settle()
    expect(controller.store.getSnapshot().detail).toMatchObject({ status: 'ready' })
  })

  it('leaves a non-Error rejection without displayable text', async () => {
    const { remote } = fakeRemote({
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- non-Error rejection normalization is the scenario.
      listDetails: () => Promise.reject('boom'),
    })
    const controller = new SkillViewerController(remote, fakeSessions(A).sessions)

    controller.open()
    await settle()

    expect(controller.store.getSnapshot()).toMatchObject({ status: 'error', error: null })
  })

  it('retry bypasses the cache for the current session', async () => {
    const { remote, calls } = fakeRemote()
    const controller = await ready(remote)

    controller.retry()
    await settle()

    expect(controller.store.getSnapshot().status).toBe('ready')
    expect(calls).toHaveLength(4)
  })
})

/** A get script holding one deferred body per skill name. */
function deferredBodies(mode: 'resolve' | 'reject') {
  const waiters = new Map<string, ((value: never) => void)[]>()
  const release = (name: string, value?: unknown): void => {
    for (const waiter of waiters.get(name) ?? []) {
      if (mode === 'resolve') (waiter as (value: unknown) => void)(value)
      else (waiter as (error: unknown) => void)(value ?? new Error('offline'))
    }
  }
  const script: Script = {
    get: request => new Promise((resolve, reject) => {
      const name = (request as { name: string }).name
      const waiter = mode === 'resolve' ? resolve : reject
      waiters.set(name, [...waiters.get(name) ?? [], waiter])
    }),
  }
  return { script, release }
}

describe('SkillViewerController detail lifecycle', () => {
  it('lets a pending selection finish across same-session updates and keeps back navigation on the list', async () => {
    const { script, release } = deferredBodies('resolve')
    const { remote } = fakeRemote(script)
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    try {
      controller.open()
      await settle()
      controller.select('write')
      holder.switchTo(A)
      release('write', detail({ name: 'write' }))
      release('review', detail())
      await settle()
      expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'write', status: 'ready' })
      controller.back()
      holder.switchTo(A)
      expect(controller.store.getSnapshot().detail).toBeNull()
    } finally { controller.dispose() }
  })

  it('keeps the selected skill and pending reference when the same session publishes an update', async () => {
    const preview = Promise.withResolvers<{ path: string; content: string; bytes: number; truncated: boolean }>()
    const { remote, calls } = fakeRemote({
      listDetails: () => Promise.resolve(listValue({ skills: [entry(), entry({ name: 'write' })] })),
      get: request => Promise.resolve(detail({ name: (request as { name: string }).name })),
      readReference: () => preview.promise,
    })
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    try {
      controller.open()
      await settle()
      controller.select('write')
      await settle()
      controller.selectReference('references/guide.md')
      const selected = controller.store.getSnapshot()
      holder.switchTo(A)
      expect(controller.store.getSnapshot()).toBe(selected)
      preview.resolve({ path: 'references/guide.md', content: 'Writing guide', bytes: 13, truncated: false })
      await settle()
      expect(controller.store.getSnapshot()).toMatchObject({ detail: { name: 'write' }, reference: { status: 'ready', value: { content: 'Writing guide' } } })
      expect(calls.filter(call => call.method === 'get')).toHaveLength(2)
    } finally { controller.dispose() }
  })

  it.each(['reopen', 'refresh'] as const)('keeps the selected skill on %s', async (action) => {
    const { remote } = fakeRemote({
      listDetails: () => Promise.resolve(listValue({ skills: [entry(), entry({ name: 'write' })] })),
      get: request => Promise.resolve(detail({ name: (request as { name: string }).name })),
    })
    const controller = await ready(remote)
    try {
      controller.select('write')
      await settle()
      if (action === 'reopen') { controller.close(); controller.open() }
      else controller.retry()
      await settle()
      expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'write', status: 'ready' })
    } finally { controller.dispose() }
  })

  it.each(['resolve', 'reject'] as const)('ignores body %s when Session notification follows its snapshot', async (mode) => {
    const { script, release } = deferredBodies(mode)
    const { remote } = fakeRemote(script)
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()
    const before = controller.store.getSnapshot()
    holder.switchTo(B, false)
    release('review', mode === 'resolve' ? detail() : new Error('offline'))
    await settle()
    expect(controller.store.getSnapshot()).toBe(before)
    controller.dispose()
  })

  it('drives a body selection through loading to ready', async () => {
    const { script, release } = deferredBodies('resolve')
    const { remote } = fakeRemote(script)
    const controller = await ready(remote)

    controller.select('review')
    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'loading' })
    release('review', detail())
    await settle()
    expect(controller.store.getSnapshot().detail).toMatchObject({
      name: 'review', status: 'ready', value: { name: 'review' },
    })
  })

  it('back returns from the detail to the list', async () => {
    const { remote } = fakeRemote()
    const controller = await ready(remote)

    controller.select('review')
    await settle()
    controller.back()

    expect(controller.store.getSnapshot().detail).toBeNull()
  })

  it('does not paint a superseded selection', async () => {
    const { script, release } = deferredBodies('resolve')
    const { remote } = fakeRemote(script)
    const controller = await ready(remote)

    controller.select('review')
    controller.select('other')
    release('review', detail({ name: 'review' }))
    await settle()

    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'other', status: 'loading' })
  })

  it('does not paint a body settlement after a session switch', async () => {
    const { script, release } = deferredBodies('resolve')
    const { remote } = fakeRemote(script)
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()

    controller.select('review')
    holder.switchTo(B)
    release('review', detail({ name: 'review' }))
    await settle()

    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'loading', value: null, error: null })
  })

  it('does not paint a body failure for a superseded selection', async () => {
    const { script, release } = deferredBodies('reject')
    const { remote } = fakeRemote(script)
    const controller = await ready(remote)

    controller.select('review')
    controller.select('other')
    release('review')
    await settle()

    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'other', status: 'loading' })
  })

  it('does not paint a body failure for a withdrawn selection', async () => {
    const { script, release } = deferredBodies('reject')
    const { remote } = fakeRemote(script)
    const controller = await ready(remote)

    controller.select('review')
    controller.back()
    release('review')
    await settle()

    expect(controller.store.getSnapshot().detail).toBeNull()
  })

  it('does not paint a body failure after a session switch', async () => {
    const { script, release } = deferredBodies('reject')
    const { remote } = fakeRemote(script)
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()

    controller.select('review')
    holder.switchTo(B)
    release('review')
    await settle()

    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'loading', value: null, error: null })
  })
})

describe('SkillViewerController invalidation', () => {
  it('keeps the initial selection when another session is invalidated while loading', async () => {
    const listing = Promise.withResolvers<SkillViewerListValue>()
    const { remote } = fakeRemote({ listDetails: () => listing.promise })
    const controller = new SkillViewerController(remote, fakeSessions(A).sessions)
    controller.open()
    controller.invalidate(B)
    listing.resolve(listValue())
    await settle()
    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'ready' })
    controller.dispose()
  })

  it('drops one session\u2019s entries on invalidate and refetches when open', async () => {
    const { remote, calls } = fakeRemote()
    const controller = await ready(remote)

    controller.invalidate(A)
    await settle()

    expect(calls).toHaveLength(4)
    expect(controller.store.getSnapshot().status).toBe('ready')
  })

  it('drops every session on a whole-cache invalidate', async () => {
    const signals: AbortSignal[] = []
    const { remote, calls } = fakeRemote({
      get: (_request, signal) => {
        signals.push(signal)
        return new Promise<SkillViewerGetValue>(() => {})
      },
    })
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()
    controller.select('review')

    controller.invalidate()
    expect(signals[0]?.aborted).toBe(true)

    controller.open()
    await settle()
    expect(calls.filter(call => call.method === 'listDetails')).toHaveLength(2)
  })

  it('does not refetch from invalidate when the panel is closed', async () => {
    const { remote, calls } = fakeRemote()
    const controller = await ready(remote)

    controller.close()
    controller.invalidate(A)
    await settle()

    expect(calls).toHaveLength(2)
  })

  it('repaints the new session when the selection changes under an open panel', async () => {
    const { remote, calls } = fakeRemote()
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()

    controller.select('review')
    await settle()
    holder.switchTo(B)
    await settle()

    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'ready' })
    expect(calls.at(-1)?.request).toEqual({ sessionId: B, name: 'review' })
  })

  it('stays quiet when the selection changes while the panel is closed', async () => {
    const { remote, calls } = fakeRemote()
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()
    controller.close()

    holder.switchTo(B)
    await settle()

    expect(calls.filter(call => call.method === 'listDetails')).toHaveLength(1)
  })

  it('never paints a stale session\u2019s settlement', async () => {
    let release: ((value: SkillViewerListValue) => void) | undefined
    const { remote } = fakeRemote({
      listDetails: request => (request as { sessionId: SessionId }).sessionId === A
        ? new Promise<SkillViewerListValue>((resolve) => { release = resolve })
        : Promise.resolve(listValue()),
    })
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)

    controller.open()
    holder.switchTo(B)
    release!(listValue({ stale: true }))
    await settle()

    expect(controller.store.getSnapshot()).toMatchObject({
      status: 'ready', scoped: true, stale: false,
    })
  })
})

describe('SkillViewerController unaddressed views', () => {
  it('ignores a selection without an addressable session', async () => {
    const { remote, calls } = fakeRemote()
    const controller = new SkillViewerController(remote, fakeSessions(undefined).sessions)

    controller.select('review')
    await settle()

    expect(controller.store.getSnapshot().detail).toBeNull()
    expect(calls).toEqual([])
  })

  it('retry without an addressable session repaints the unscoped view', async () => {
    const { remote, calls } = fakeRemote()
    const controller = new SkillViewerController(remote, fakeSessions(undefined).sessions)

    controller.retry()
    await settle()

    expect(controller.store.getSnapshot()).toMatchObject({ status: 'ready', scoped: false })
    expect(calls).toEqual([])
  })
})

describe('SkillViewerController single-flight and cleanup', () => {
  /** A listDetails script holding one deferred list per session. */
  function deferredLists(mode: 'resolve' | 'reject') {
    const signals: AbortSignal[] = []
    const waiters = new Map<SessionId, Array<(value: never) => void>>()
    const release = (sessionId: SessionId, value?: SkillViewerListValue): void => {
      for (const waiter of waiters.get(sessionId) ?? []) {
        if (mode === 'resolve') (waiter as (value: SkillViewerListValue) => void)(value ?? listValue())
        else (waiter as (error: unknown) => void)(new Error('offline'))
      }
    }
    const script: Script = {
      listDetails: (request, signal) => {
        signals.push(signal)
        const sessionId = (request as { sessionId: SessionId }).sessionId
        return new Promise((resolve, reject) => {
          const waiter = mode === 'resolve' ? resolve : reject
          waiters.set(sessionId, [...waiters.get(sessionId) ?? [], waiter])
        })
      },
    }
    return { script, release, signals }
  }

  it.each(['resolve', 'reject'] as const)('ignores list %s when Session notification follows its snapshot', async (mode) => {
    const { script, release } = deferredLists(mode)
    const { remote } = fakeRemote(script)
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    const before = controller.store.getSnapshot()
    holder.switchTo(B, false)
    release(A)
    await settle()
    expect(controller.store.getSnapshot()).toBe(before)
    controller.dispose()
  })

  it('collapses concurrent opens onto one in-flight list read', async () => {
    const { script, release } = deferredLists('resolve')
    const { remote, calls } = fakeRemote(script)
    const controller = new SkillViewerController(remote, fakeSessions(A).sessions)

    controller.open()
    controller.open()
    release(A)
    await settle()

    expect(calls).toHaveLength(2)
    expect(controller.store.getSnapshot().status).toBe('ready')
  })

  it('collapses concurrent selections of one skill onto a single body read', async () => {
    const { script, release } = deferredBodies('resolve')
    const { remote, calls } = fakeRemote(script)
    const controller = await ready(remote)

    controller.select('review')
    controller.select('review')
    release('review', detail())
    await settle()

    expect(calls.filter(call => call.method === 'get')).toHaveLength(1)
    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'ready' })
  })

  it('does not paint a list failure after a session switch', async () => {
    const { script, release } = deferredLists('reject')
    const { remote } = fakeRemote(script)
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)

    controller.open()
    holder.switchTo(B)
    release(A)
    await settle()

    expect(controller.store.getSnapshot()).toMatchObject({ status: 'loading', scoped: true })
  })

  it('leaves a superseded list entry to its own failure cleanup', async () => {
    const { script, release } = deferredLists('reject')
    const { remote, calls } = fakeRemote(script)
    const controller = new SkillViewerController(remote, fakeSessions(A).sessions)

    controller.open()
    controller.retry()
    release(A)
    await settle()

    expect(calls).toHaveLength(2)
    expect(controller.store.getSnapshot().status).toBe('error')
  })

  it('leaves a superseded body entry to its own failure cleanup', async () => {
    const { script, release } = deferredBodies('reject')
    const { remote } = fakeRemote(script)
    const controller = await ready(remote)

    controller.select('review')
    controller.invalidate(A)
    await settle()
    release('review')

    controller.select('review')
    await settle()
    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'error' })
  })

  it('aborts a session\u2019s in-flight body when its cache is invalidated', async () => {
    const signals: AbortSignal[] = []
    const { remote } = fakeRemote({
      get: (_request, signal) => {
        signals.push(signal)
        return new Promise<SkillViewerGetValue>(() => {})
      },
    })
    const controller = await ready(remote)

    controller.select('review')
    controller.invalidate(A)

    expect(signals[0]?.aborted).toBe(true)
  })

  it('skips other sessions\u2019 bodies when invalidating one session', async () => {
    const { script, release } = deferredBodies('resolve')
    const { remote } = fakeRemote(script)
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.open()
    await settle()

    holder.switchTo(B)
    await settle()
    controller.select('review')
    controller.invalidate(A)
    release('review', detail())
    await settle()

    expect(controller.store.getSnapshot().detail).toMatchObject({ name: 'review', status: 'ready' })
  })
})

describe('SkillViewerController teardown', () => {
  it('setQuery records the search text', async () => {
    const { remote } = fakeRemote()
    const controller = await ready(remote)

    controller.setQuery('rev')

    expect(controller.store.getSnapshot().query).toBe('rev')
  })

  it('dispose aborts in-flight fetches and stops following session changes', async () => {
    const signals: AbortSignal[] = []
    const { remote, calls } = fakeRemote({
      listDetails: (_request, signal) => {
        signals.push(signal)
        return new Promise<SkillViewerListValue>(() => {})
      },
    })
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)

    controller.open()
    controller.dispose()
    holder.switchTo(B)
    await settle()

    expect(signals[0]?.aborted).toBe(true)
    expect(calls).toHaveLength(1)
  })

  it('dispose aborts an in-flight body fetch', async () => {
    const signals: AbortSignal[] = []
    const { remote } = fakeRemote({
      get: (_request, signal) => {
        signals.push(signal)
        return new Promise<SkillViewerGetValue>(() => {})
      },
    })
    const controller = await ready(remote)

    controller.select('review')
    controller.dispose()

    expect(signals[0]?.aborted).toBe(true)
  })

  it('stays quiet on a repeated dispose', async () => {
    const { remote } = fakeRemote()
    const controller = await ready(remote)

    expect(() => { controller.dispose() }).not.toThrow()
  })
})

describe('SkillViewerController reference previews', () => {
  it('ignores reference selections without an addressable Session and a ready skill', () => {
    const { remote, calls } = fakeRemote()
    const holder = fakeSessions(A)
    const controller = new SkillViewerController(remote, holder.sessions)
    controller.selectReference('references/guide.md')
    holder.switchTo(undefined)
    controller.selectReference('references/guide.md')
    expect(calls).toEqual([])
    expect(controller.store.getSnapshot().reference).toBeNull()
    controller.dispose()
  })

  it('reports a rejected reference request', async () => {
    const { remote } = fakeRemote({ readReference: () => Promise.reject(new Error('connection lost')) })
    const controller = await ready(remote)
    controller.selectReference('references/guide.md')
    await settle()
    expect(controller.store.getSnapshot().reference).toMatchObject({ status: 'error', error: 'connection lost' })
    controller.dispose()
  })

  it('cancels a reference when the panel closes and ignores its late rejection', async () => {
    const pending = Promise.withResolvers<unknown>()
    let signal: AbortSignal | undefined
    const { remote } = fakeRemote({ readReference: (_request, active) => {
      signal = active
      return pending.promise
    } })
    const controller = await ready(remote)
    controller.selectReference('references/guide.md')
    controller.close()
    expect(signal?.aborted).toBe(true)
    pending.reject(new Error('connection lost'))
    await settle()
    expect(controller.store.getSnapshot()).toMatchObject({ open: false, reference: null })
    controller.dispose()
  })

  it('reads a reference and returns to the same skill', async () => {
    const { remote, calls } = fakeRemote()
    const controller = await ready(remote)
    controller.selectReference('references/guide.md')
    expect(controller.store.getSnapshot().reference?.status).toBe('loading')
    await settle()
    expect(controller.store.getSnapshot().reference).toMatchObject({ status: 'ready', value: { content: '# Guide' } })
    expect(calls.at(-1)).toEqual({ method: 'readReference', request: { sessionId: A, name: 'review', path: 'references/guide.md' } })
    controller.back()
    expect(controller.store.getSnapshot().reference).toBeNull()
    expect(controller.store.getSnapshot().detail?.name).toBe('review')
  })

  it('cancels a reference on selection changes and ignores its late response', async () => {
    let signal: AbortSignal | undefined
    let release!: (value: unknown) => void
    const { remote } = fakeRemote({
      readReference: (_request, active) => {
        signal = active
        return new Promise((resolve) => { release = resolve })
      },
    })
    const controller = await ready(remote)
    controller.selectReference('references/guide.md')
    controller.select('other')
    expect(signal?.aborted).toBe(true)
    release({ path: 'references/guide.md', content: 'late', bytes: 4, truncated: false })
    await settle()
    expect(controller.store.getSnapshot().reference).toBeNull()
    expect(controller.store.getSnapshot().detail?.name).toBe('other')
  })

  it('reports a read error and retries without caching the failure', async () => {
    let failing = true
    const { remote } = fakeRemote({
      readReference: () => Promise.resolve(failing
        ? { ok: false, error: { code: 'skillViewer/reference-unavailable', message: 'gone', details: { path: 'references/guide.md' } } }
        : { path: 'references/guide.md', content: 'restored', bytes: 8, truncated: false }),
    })
    const controller = await ready(remote)
    controller.selectReference('references/guide.md')
    await settle()
    expect(controller.store.getSnapshot().reference?.status).toBe('error')
    failing = false
    controller.selectReference('references/guide.md')
    await settle()
    expect(controller.store.getSnapshot().reference).toMatchObject({ status: 'ready', value: { content: 'restored' } })
    controller.selectReference('')
    expect(controller.store.getSnapshot().reference).toBeNull()
  })
})

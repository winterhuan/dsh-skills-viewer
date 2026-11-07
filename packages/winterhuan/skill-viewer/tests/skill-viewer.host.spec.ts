import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { SessionQueryError, type SessionObservation } from '@deepseek-ai/dsh-session-query'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-skill'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SkillViewerCatalog } from '../src/index.ts'
import * as references from '../src/references.ts'

vi.mock('../src/references.ts', async importOriginal => ({
  ...await importOriginal<typeof references>(),
}))

afterEach(() => { vi.restoreAllMocks() })

function observation(
  sessionId: SessionId,
  options: { readonly cwd?: string; readonly agentPreset?: string } = {},
): SessionObservation {
  const events = Object.freeze([])
  const lease = (): SessionObservation => ({
    source: 'live',
    header: {
      version: SESSION_FORMAT_VERSION,
      id: sessionId,
      createdAt: 1,
      isSeeded: false,
      ...options.cwd === undefined ? {} : { cwd: options.cwd },
    },
    events,
    inheritedEventCount: SessionLogOffset(0),
    cursor: -1,
    projections: {
      asOfSeq: -1,
      values: {
        ...options.agentPreset === undefined ? {} : { agentPreset: options.agentPreset },
      },
    },
    retain: lease,
    [Symbol.dispose]: () => {},
  })
  return lease()
}

async function context(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(AgentRegistry)
  return ctx
}

const REVIEW = {
  name: 'review',
  description: 'Review the current change.',
  whenToUse: 'Before publishing.',
  invocation: { modelInvocable: true, userInvocable: true },
  source: 'project-dsh',
  provider: 'filesystem',
}

const USER_ONLY = {
  name: 'release-notes',
  description: 'Draft release notes on request.',
  invocation: { modelInvocable: false, userInvocable: true },
  source: 'user-dsh',
  provider: 'filesystem',
}

const MODEL_ONLY = {
  name: 'model-only',
  description: 'Not shown to the user.',
  invocation: { modelInvocable: true, userInvocable: false },
  source: 'project-dsh',
  provider: 'filesystem',
}

describe('SkillViewerCatalog listDetails', () => {
  it('reads a cold Session catalog with source metadata without resuming an Agent', async () => {
    const ctx = await context()
    const sessionId = SessionId('cold-viewer')
    const observed = observation(sessionId, { cwd: '/cold/project' })
    const dispose = vi.spyOn(observed, Symbol.dispose)
    const observeSession = vi.fn(() => Promise.resolve(observed))
    ctx.provide('sessionQuery', { observeSession } as never)
    const resume = vi.spyOn(ctx.agents, 'resume')
    const snapshot = vi.fn(() => Promise.resolve({
      skills: [REVIEW, MODEL_ONLY],
      complete: true,
    }))
    ctx.provide('skills', { snapshot } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails({ sessionId }, new AbortController().signal)).resolves.toEqual({
      skills: [{
        name: 'review',
        description: 'Review the current change.',
        whenToUse: 'Before publishing.',
        modelInvocable: true,
        userInvocable: true,
        source: 'project-dsh',
        provider: 'filesystem',
      }],
      stale: false,
    })
    expect(observeSession).toHaveBeenCalledWith(sessionId)
    expect(dispose).toHaveBeenCalledOnce()
    expect(resume).not.toHaveBeenCalled()
    expect(ctx.agents.list()).toEqual([])
    expect(snapshot).toHaveBeenCalledWith({ cwd: '/cold/project', scope: undefined })
  })

  it('marks the list stale when a provider observation is incomplete', async () => {
    const ctx = await context()
    const sessionId = SessionId('stale-viewer')
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, { cwd: '/project' })),
    } as never)
    ctx.provide('skills', {
      snapshot: () => Promise.resolve({ skills: [USER_ONLY], complete: false }),
    } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails({ sessionId }, new AbortController().signal)).resolves.toEqual({
      skills: [{
        name: 'release-notes',
        description: 'Draft release notes on request.',
        modelInvocable: false,
        userInvocable: true,
        source: 'user-dsh',
        provider: 'filesystem',
      }],
      stale: true,
    })
  })

  it('uses a live Agent to address a preset-owned registry', async () => {
    const ctx = await context()
    const sessionId = SessionId('live-viewer')
    const session = ctx.sessions.create(sessionId, { meta: { cwd: '/live/project' } })
    const agent = { id: sessionId, session, status: 'idle', ctx } as Agent
    ctx.agents.register(agent)
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, { cwd: '/live/project' })),
    } as never)
    const scopedSnapshot = vi.fn(() => Promise.resolve({ skills: [REVIEW], complete: true }))
    const standingKeyFor = vi.fn()
    ctx.provide('agentPresets', {
      serviceFor: () => ({ snapshot: scopedSnapshot }),
      standingKeyFor,
    } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails({ sessionId }, new AbortController().signal)).resolves.toMatchObject({
      skills: [{ name: 'review' }],
      stale: false,
    })
    expect(scopedSnapshot).toHaveBeenCalledWith({ cwd: '/live/project', scope: agent })
    expect(standingKeyFor).not.toHaveBeenCalled()
  })

  it('reads the global registry under a live Agent scope when no preset roster is composed', async () => {
    const ctx = await context()
    const sessionId = SessionId('live-noroster')
    const session = ctx.sessions.create(sessionId, { meta: { cwd: '/live/project' } })
    const agent = { id: sessionId, session, status: 'idle', ctx } as Agent
    ctx.agents.register(agent)
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, { cwd: '/live/project' })),
    } as never)
    const snapshot = vi.fn(() => Promise.resolve({ skills: [], complete: true }))
    ctx.provide('skills', { snapshot } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails({ sessionId }, new AbortController().signal)).resolves.toEqual({
      skills: [],
      stale: false,
    })
    expect(snapshot).toHaveBeenCalledWith({ cwd: '/live/project', scope: agent })
  })

  it('uses the recorded preset standing scope for a cold Session', async () => {
    const ctx = await context()
    const sessionId = SessionId('standing-viewer')
    const scope = { agentPreset: 'minimal' }
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, {
        cwd: '/cold/project',
        agentPreset: 'minimal',
      })),
    } as never)
    const acquireScope = vi.fn(() => Promise.resolve({ key: scope, [Symbol.asyncDispose]: async () => {} }))
    ctx.provide('agentPresets', { acquireScope } as never)
    const snapshot = vi.fn(() => Promise.resolve({ skills: [], complete: true }))
    ctx.provide('skills', { snapshot } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails({ sessionId }, new AbortController().signal)).resolves.toEqual({
      skills: [],
      stale: false,
    })
    expect(acquireScope).toHaveBeenCalledWith('minimal')
    expect(snapshot).toHaveBeenCalledWith({ cwd: '/cold/project', scope })
    expect(ctx.agents.list()).toEqual([])
  })

  it('falls back to the global registry when the recorded preset is unavailable', async () => {
    const ctx = await context()
    const sessionId = SessionId('gone-viewer')
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, {
        cwd: '/cold/project',
        agentPreset: 'gone',
      })),
    } as never)
    ctx.provide('agentPresets', {
      acquireScope: () => Promise.reject(new Error('unknown preset')),
    } as never)
    const snapshot = vi.fn(() => Promise.resolve({ skills: [], complete: true }))
    ctx.provide('skills', { snapshot } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails({ sessionId }, new AbortController().signal)).resolves.toEqual({
      skills: [],
      stale: false,
    })
    expect(snapshot).toHaveBeenCalledWith({ cwd: '/cold/project', scope: undefined })
  })

  it.each([
    {
      error: new SessionQueryError(
        'session "missing-viewer" not found',
        'SESSION_QUERY_SESSION_NOT_FOUND',
      ),
      code: 'skillViewer/session-not-found',
    },
    { error: new Error('storage offline'), code: 'gateway/internal' },
  ] as const)('classifies failed Session inspection as $code', async ({ error, code }) => {
    const ctx = await context()
    ctx.provide('sessionQuery', { observeSession: () => Promise.reject(error) } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails(
      { sessionId: SessionId('missing-viewer') },
      new AbortController().signal,
    )).rejects.toMatchObject({ code })
  })

  it('reports an absent skill registry instead of an empty catalog', async () => {
    const ctx = await context()
    const sessionId = SessionId('no-viewer')
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, { cwd: '/project' })),
    } as never)
    const catalog = new SkillViewerCatalog(ctx)

    const failed = catalog.listDetails({ sessionId }, new AbortController().signal)
    await expect(failed).rejects.toMatchObject({ code: 'gateway/internal' })
    await expect(failed).rejects.toThrow('skill registry is absent')
  })

  it('rejects observations without projections or a project cwd', async () => {
    const ctx = await context()
    const sessionId = SessionId('incomplete-viewer')
    const withoutProjections = { ...observation(sessionId, { cwd: '/project' }), projections: undefined }
    const observeSession = vi.fn()
      .mockResolvedValueOnce(withoutProjections)
      .mockResolvedValueOnce(observation(sessionId))
    ctx.provide('sessionQuery', { observeSession } as never)
    const catalog = new SkillViewerCatalog(ctx)

    const unprojected = catalog.listDetails({ sessionId }, new AbortController().signal)
    await expect(unprojected).rejects.toMatchObject({ code: 'gateway/internal' })
    await expect(unprojected).rejects.toThrow('projected Session observation')
    const cwdless = catalog.listDetails({ sessionId }, new AbortController().signal)
    await expect(cwdless).rejects.toMatchObject({ code: 'gateway/internal' })
    await expect(cwdless).rejects.toThrow('has no project cwd')
  })

  it('classifies a provider snapshot failure', async () => {
    const ctx = await context()
    const sessionId = SessionId('failed-viewer')
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, { cwd: '/project' })),
    } as never)
    ctx.provide('skills', {
      snapshot: () => Promise.reject(new Error('catalog offline')),
    } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.listDetails({ sessionId }, new AbortController().signal))
      .rejects.toMatchObject({
        code: 'gateway/internal', message: 'skill viewer listing failed: Error: catalog offline',
      })
  })
})

describe('SkillViewerCatalog get', () => {
  function viewerWith(definition: unknown): Promise<{ catalog: SkillViewerCatalog; sessionId: SessionId }> {
    return context().then((ctx) => {
      const sessionId = SessionId('get-viewer')
      ctx.provide('sessionQuery', {
        observeSession: () => Promise.resolve(observation(sessionId, { cwd: '/project' })),
      } as never)
      ctx.provide('skills', { get: () => Promise.resolve(definition) } as never)
      return { catalog: new SkillViewerCatalog(ctx), sessionId }
    })
  }

  it('rejects an invalid skill name without touching the registry', async () => {
    const ctx = await context()
    const get = vi.fn()
    ctx.provide('skills', { get } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.get(
      { sessionId: SessionId('get-viewer'), name: 'Not_A_Skill' },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'gateway/bad-request' })
    expect(get).not.toHaveBeenCalled()
  })

  it('reports an unknown skill instead of a body', async () => {
    const { catalog, sessionId } = await viewerWith(undefined)

    const failed = catalog.get({ sessionId, name: 'gone' }, new AbortController().signal)
    await expect(failed).rejects.toMatchObject({
      code: 'skillViewer/unknown-skill',
      details: { sessionId, name: 'gone' },
    })
    await expect(failed).rejects.toThrow('unknown or no longer available')
  })

  it('hides a skill disabled for user invocation', async () => {
    const { catalog, sessionId } = await viewerWith({
      ...REVIEW,
      content: 'Hidden body.',
      invocation: { modelInvocable: true, userInvocable: false },
    })

    await expect(catalog.get({ sessionId, name: 'review' }, new AbortController().signal))
      .rejects.toMatchObject({ code: 'skillViewer/unknown-skill' })
  })

  it('loads a directory-based skill with its path', async () => {
    const { catalog, sessionId } = await viewerWith({
      ...REVIEW,
      content: '# Review\nFollow the checklist.',
      path: '/project/.dsh/skills/review/SKILL.md',
      resourceBase: { kind: 'directory', path: '/project/.dsh/skills/review' },
    })

    await expect(catalog.get({ sessionId, name: 'review' }, new AbortController().signal)).resolves.toEqual({
      name: 'review',
      description: 'Review the current change.',
      whenToUse: 'Before publishing.',
      modelInvocable: true,
      userInvocable: true,
      source: 'project-dsh',
      provider: 'filesystem',
      path: '/project/.dsh/skills/review/SKILL.md',
      resourceBase: { kind: 'directory', path: '/project/.dsh/skills/review' },
      content: '# Review\nFollow the checklist.',
      references: { files: [], truncated: false },
    })
  })

  it('loads a url-based skill without a path', async () => {
    const { catalog, sessionId } = await viewerWith({
      name: 'remote-helper',
      description: 'Served remotely.',
      invocation: { modelInvocable: true, userInvocable: true },
      source: 'bundled',
      provider: 'remote',
      resourceBase: { kind: 'url', url: 'https://example.invalid/skills/remote-helper/' },
      content: 'Remote body.',
    })

    await expect(catalog.get({ sessionId, name: 'remote-helper' }, new AbortController().signal)).resolves.toEqual({
      name: 'remote-helper',
      description: 'Served remotely.',
      modelInvocable: true,
      userInvocable: true,
      source: 'bundled',
      provider: 'remote',
      resourceBase: { kind: 'url', url: 'https://example.invalid/skills/remote-helper/' },
      content: 'Remote body.',
      references: null,
    })
  })

  it.each([
    undefined,
    { kind: 'directory', path: 'relative/skill' },
    { kind: 'url', url: 'https://example.invalid/skill/' },
    { kind: 'opaque', description: 'Provider-managed resources.' },
  ])('refuses local reference reads without an absolute resource directory: %j', async (resourceBase) => {
    const { catalog, sessionId } = await viewerWith({ ...REVIEW, content: 'Body.', resourceBase })
    const signal = new AbortController().signal
    await expect(catalog.get({ sessionId, name: 'review' }, signal)).resolves.toMatchObject({ references: null })
    await expect(catalog.readReference({ sessionId, name: 'review', path: 'references/guide.md' }, signal))
      .rejects.toMatchObject({ code: 'skillViewer/reference-unavailable', details: { path: 'references/guide.md' } })
  })

  it.each(['listReferences', 'readReference'] as const)('preserves typed errors and cancellation from %s', async (operation) => {
    const { catalog, sessionId } = await viewerWith({
      ...REVIEW, content: 'Body.', resourceBase: { kind: 'directory', path: '/skills/review' },
    })
    const call = (signal: AbortSignal) => operation === 'listReferences'
      ? catalog.get({ sessionId, name: 'review' }, signal)
      : catalog.readReference({ sessionId, name: 'review', path: 'references/guide.md' }, signal)
    const failure = new RemoteError('skillViewer/reference-unavailable', 'Reference changed while opening.', { path: 'references/guide.md' })
    vi.spyOn(references, operation).mockRejectedValueOnce(failure)
    await expect(call(new AbortController().signal)).rejects.toBe(failure)

    const abort = new AbortController()
    abort.abort()
    vi.spyOn(references, operation).mockRejectedValueOnce(abort.signal.reason)
    await expect(call(abort.signal)).rejects.toBe(abort.signal.reason)

    vi.spyOn(references, operation).mockRejectedValueOnce(new Error('storage offline'))
    await expect(call(new AbortController().signal)).rejects.toMatchObject({
      code: operation === 'listReferences' ? 'gateway/internal' : 'skillViewer/reference-unavailable',
      message: expect.stringContaining('storage offline') as string,
    })
  })

  it('checks the current invocation policy before opening a reference', async () => {
    const { catalog, sessionId } = await viewerWith({
      ...REVIEW, content: 'Body.', invocation: { modelInvocable: true, userInvocable: false },
      resourceBase: { kind: 'directory', path: '/skills/review' },
    })
    const read = vi.spyOn(references, 'readReference')
    await expect(catalog.readReference({ sessionId, name: 'review', path: 'references/guide.md' }, new AbortController().signal))
      .rejects.toMatchObject({ code: 'skillViewer/unknown-skill' })
    expect(read).not.toHaveBeenCalled()
  })

  it('loads opaque and provider-managed skills', async () => {
    const opaque = await viewerWith({
      name: 'opaque-helper',
      description: 'Opaque resources.',
      invocation: { modelInvocable: false, userInvocable: true },
      source: 'custom',
      provider: 'other',
      resourceBase: { kind: 'opaque', description: 'Ask the provider.' },
      content: 'Opaque body.',
    })
    await expect(opaque.catalog.get(
      { sessionId: opaque.sessionId, name: 'opaque-helper' },
      new AbortController().signal,
    )).resolves.toMatchObject({
      resourceBase: { kind: 'opaque', description: 'Ask the provider.' },
    })

    const managed = await viewerWith({
      ...USER_ONLY,
      content: 'Managed body.',
    })
    await expect(managed.catalog.get(
      { sessionId: managed.sessionId, name: 'release-notes' },
      new AbortController().signal,
    )).resolves.toEqual({
      name: 'release-notes',
      description: 'Draft release notes on request.',
      modelInvocable: false,
      userInvocable: true,
      source: 'user-dsh',
      provider: 'filesystem',
      content: 'Managed body.',
      references: null,
    })
  })

  it('classifies a provider load failure', async () => {
    const ctx = await context()
    const sessionId = SessionId('failed-get')
    ctx.provide('sessionQuery', {
      observeSession: () => Promise.resolve(observation(sessionId, { cwd: '/project' })),
    } as never)
    ctx.provide('skills', {
      get: () => Promise.reject(new Error('body offline')),
    } as never)
    const catalog = new SkillViewerCatalog(ctx)

    await expect(catalog.get({ sessionId, name: 'review' }, new AbortController().signal))
      .rejects.toMatchObject({
        code: 'gateway/internal', message: 'skill viewer load failed: Error: body offline',
      })
  })
})

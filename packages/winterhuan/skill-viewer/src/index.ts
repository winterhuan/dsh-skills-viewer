/**
 * Read-only skill catalog and body Remote for the skill viewer.
 *
 * This package owns the Session-addressed `skillViewer` Remote namespace
 * serving the human skill-viewer UI. It reads the layered `ctx.skills`
 * registry through the viewing Session's cwd and preset scope and never
 * writes the session log: viewer reads are human presentation, not
 * model-visible input, so they need no durable event.
 *
 * The neighboring `skills` namespace keeps serving the composer slash
 * source; this namespace exists because that payload carries neither
 * source/provider metadata nor skill bodies, and its contract is frozen.
 *
 * @module @winterhuan/dsh-skill-viewer
 */

import type { Context } from '@deepseek-ai/cordis'
import { constants as bufferConstants } from 'node:buffer'
import { isAbsolute } from 'node:path'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-preset-registry'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { SessionQueryError } from '@deepseek-ai/dsh-session-query'
import type { ScopeKey } from '@deepseek-ai/dsh-scope'
import {
  isSkillName,
  isUserInvocable,
  type SkillDefinition,
  type SkillRegistry,
  type SkillSummary,
} from '@deepseek-ai/dsh-skill'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  SkillViewerEntry,
  SkillViewerGetRequest,
  SkillViewerGetValue,
  SkillViewerListRequest,
  SkillViewerListValue,
  SkillViewerResourceBase,
  SkillViewerReferences,
  SkillViewerReferenceRequest,
  SkillViewerReferenceValue,
} from './types.ts'
import { listReferences, readReference as readLocalReference } from './references.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the Session-addressed `skillViewer` Remote namespace. */
    skillViewerCatalog: SkillViewerCatalog
  }
}

/** Resolved read position for one viewer request. */
interface SkillViewerView {
  /** Workspace selector for provider discovery. */
  readonly cwd: string
  /** Viewing scope selecting the preset layers; omitted reads the global layer alone. */
  readonly scope: ScopeKey | undefined
  /** Registry serving this Session's composition. */
  readonly registry: SkillRegistry
  /** Release the preset scope lease a cold Session's view holds; idempotent no-op otherwise. */
  readonly release: () => Promise<void>
}

/** Deployment limits for reference discovery and text previews. */
export interface Config {
  /** Maximum directory entries examined while listing one skill's references. */
  readonly maxReferenceEntries?: number
  /** Maximum UTF-8 bytes returned in one reference preview. */
  readonly maxReferenceBytes?: number
}

interface ResolvedConfig {
  readonly maxReferenceEntries: number
  readonly maxReferenceBytes: number
}

/** Host service backing `ctx.remote.skillViewer` without activating a cold Agent. */
export class SkillViewerCatalog extends TypertRemoteService {
  static inject = ['agents', 'sessionQuery', 'typert']

  static Config: z<Config, ResolvedConfig> = z.object({
    maxReferenceEntries: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(1000),
    maxReferenceBytes: z.number().step(1).min(1).max(bufferConstants.MAX_LENGTH - 1).default(1024 * 1024),
  })

  private readonly config: ResolvedConfig

  /**
   * @param ctx - Host context carrying Session reads and optional skill/preset services.
   * @param config - reference discovery and preview limits, resolved at construction.
   */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'skillViewerCatalog', { namespace: 'skillViewer' })
    this.config = SkillViewerCatalog.Config(config)
  }

  /**
   * List the user-invocable skills visible to one Session composition, with
   * the source and provider metadata the composer catalog omits.
   * @param request - Session identity whose cwd and preset select the catalog view.
   * @param signal - caller lifetime carried by the Remote transport; admitted catalog reads retain their existing completion semantics.
   * @returns user-invocable skill metadata without bodies, plus whether a provider observation was incomplete.
   * @throws RemoteError when the Session cannot be inspected or no registry can serve it.
   */
  @Remote
  async listDetails(request: SkillViewerListRequest, signal: AbortSignal): Promise<SkillViewerListValue> {
    void signal
    const view = await this.viewOf(request.sessionId)
    try {
      const snapshot = await view.registry.snapshot({ cwd: view.cwd, scope: view.scope })
      return {
        skills: snapshot.skills.filter(isUserInvocable).map(toEntry),
        stale: !snapshot.complete,
      }
    } catch (error: unknown) {
      throw new RemoteError(
        'gateway/internal',
        `skill viewer listing failed: ${String(error)}`,
        {},
      )
    } finally {
      await view.release()
    }
  }

  /**
   * Load one user-invocable skill body for viewer presentation.
   * @param request - Session identity selecting the catalog view plus the exact skill name from the viewer list.
   * @param signal - caller lifetime used to cancel reference discovery.
   * @returns the full skill with body content and its local reference listing.
   * @throws RemoteError when the Session cannot be inspected, the name is invalid, or no user-invocable skill with this name is available.
   */
  @Remote
  async get(request: SkillViewerGetRequest, signal: AbortSignal): Promise<SkillViewerGetValue> {
    const definition = await this.definitionOf(request)
    let references: SkillViewerReferences | null = null
    if (definition.resourceBase?.kind === 'directory' && isAbsolute(definition.resourceBase.path)) {
      try {
        references = await listReferences(definition.resourceBase.path, this.config.maxReferenceEntries, signal)
      } catch (error: unknown) {
        if (error instanceof RemoteError || signal.aborted) throw error
        throw new RemoteError('gateway/internal', `skill reference listing failed: ${String(error)}`, {})
      }
    }
    return toValue(definition, references)
  }

  /**
   * Read one local reference of a user-invocable skill without starting an Agent.
   * @param request - Session, skill name, and relative file path under references/.
   * @param signal - caller lifetime used to cancel file reading.
   * @returns a bounded UTF-8 preview with explicit truncation and file-size metadata.
   * @throws RemoteError when the Session or skill is unavailable, the path is unsafe, or the file cannot be read as text.
   */
  @Remote
  async readReference(request: SkillViewerReferenceRequest, signal: AbortSignal): Promise<SkillViewerReferenceValue> {
    const definition = await this.definitionOf(request)
    const base = definition.resourceBase
    if (base?.kind !== 'directory' || !isAbsolute(base.path)) {
      throw new RemoteError('skillViewer/reference-unavailable', 'This skill has no local reference directory.', { path: request.path })
    }
    try {
      return await readLocalReference(base.path, request.path, this.config.maxReferenceBytes, signal)
    } catch (error: unknown) {
      if (error instanceof RemoteError || signal.aborted) throw error
      throw new RemoteError('skillViewer/reference-unavailable', `Reference could not be read: ${String(error)}`, { path: request.path })
    }
  }

  /** Load the current winning, user-invocable definition under the viewing Session's scope. */
  private async definitionOf(request: SkillViewerGetRequest): Promise<SkillDefinition> {
    if (!isSkillName(request.name)) {
      throw new RemoteError('gateway/bad-request', `skill viewer received invalid skill name "${request.name}"`, {})
    }
    const view = await this.viewOf(request.sessionId)
    let definition: SkillDefinition | undefined
    try {
      definition = await view.registry.get(request.name, { cwd: view.cwd, scope: view.scope })
    } catch (error: unknown) {
      throw new RemoteError(
        'gateway/internal',
        `skill viewer load failed: ${String(error)}`,
        {},
      )
    } finally {
      await view.release()
    }
    if (definition === undefined || !isUserInvocable(definition)) {
      throw new RemoteError(
        'skillViewer/unknown-skill',
        `skill "${request.name}" is unknown or no longer available`,
        { sessionId: request.sessionId, name: request.name },
      )
    }
    return definition
  }

  /**
   * Resolve the workspace, viewing scope, and registry for one Session.
   * A live Agent addresses its own preset layers; a cold Session resolves
   * its recorded preset's standing scope; an unknown preset falls back to
   * the global registry. Nothing here resumes an Agent.
   * @param sessionId - Session identity to inspect.
   * @returns the registry read position for this Session.
   * @throws RemoteError when the Session cannot be inspected or no registry can serve it.
   */
  private async viewOf(sessionId: SessionId): Promise<SkillViewerView> {
    let cwd: string | undefined
    let agentPreset: string | undefined
    try {
      using observation = await this.ctx.sessionQuery.observeSession(sessionId)
      if (observation.projections === undefined) {
        throw new Error('skill viewer requires a projected Session observation')
      }
      cwd = observation.header.cwd
      agentPreset = observation.projections.values.agentPreset ?? undefined
    } catch (error: unknown) {
      if (error instanceof SessionQueryError
        && error.code === 'SESSION_QUERY_SESSION_NOT_FOUND') {
        throw new RemoteError('skillViewer/session-not-found', `session "${sessionId}" not found`, { sessionId })
      }
      throw new RemoteError(
        'gateway/internal',
        `session "${sessionId}" could not be inspected: ${String(error)}`,
        {},
      )
    }
    if (cwd === undefined) {
      throw new RemoteError('gateway/internal', `session "${sessionId}" has no project cwd`, {})
    }
    const live = this.ctx.agents.get(sessionId)
    const presets = this.ctx.get('agentPresets')
    const scoped = live === undefined ? undefined : presets?.serviceFor(live, 'skills')
    const registry = scoped ?? this.ctx.get('skills')
    if (registry === undefined) {
      throw new RemoteError(
        'gateway/internal',
        'skill registry is absent: neither this session\'s agent preset nor the host composition mounts @deepseek-ai/dsh-skill',
        {},
      )
    }
    let scope: ScopeKey | undefined = live
    let release: () => Promise<void> = async () => {}
    if (live === undefined && presets !== undefined && agentPreset !== undefined) {
      try {
        const lease = await presets.acquireScope(agentPreset)
        scope = lease.key
        release = async () => { await lease[Symbol.asyncDispose]() }
      } catch {
        // An unknown or unusable recorded preset falls back to the global registry.
        scope = undefined
      }
    }
    return { cwd, scope, registry, release }
  }
}

/**
 * Project one registry summary onto the viewer entry: the composer catalog
 * drops source and provider, the viewer keeps them. Callers filter to
 * user-invocable summaries first, which is what the hardcoded flag records.
 * @param skill - user-invocable registry summary.
 * @returns the viewer list entry.
 */
function toEntry(skill: SkillSummary): SkillViewerEntry {
  return {
    name: skill.name,
    description: skill.description,
    ...skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse },
    modelInvocable: skill.invocation.modelInvocable,
    userInvocable: true,
    source: skill.source,
    provider: skill.provider,
  }
}

/**
 * Project one loaded definition onto the viewer value, detaching the
 * provider-owned resource base into JSON-safe wire data.
 * @param skill - loaded user-invocable definition with body content.
 * @param references - local reference listing, or null for provider-managed resources.
 * @returns the viewer detail value.
 */
function toValue(skill: SkillDefinition, references: SkillViewerReferences | null): SkillViewerGetValue {
  return {
    name: skill.name,
    description: skill.description,
    ...skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse },
    modelInvocable: skill.invocation.modelInvocable,
    userInvocable: true,
    source: skill.source,
    provider: skill.provider,
    ...skill.path === undefined ? {} : { path: skill.path },
    ...skill.resourceBase === undefined ? {} : { resourceBase: toResourceBase(skill.resourceBase) },
    content: skill.content,
    references,
  }
}

/**
 * Detach one provider-owned resource base into wire data.
 * @param base - provider resource base from a loaded definition.
 * @returns the JSON-safe resource base.
 */
function toResourceBase(base: NonNullable<SkillDefinition['resourceBase']>): SkillViewerResourceBase {
  if (base.kind === 'directory') return { kind: 'directory', path: base.path }
  if (base.kind === 'url') return { kind: 'url', url: base.url }
  return { kind: 'opaque', description: base.description }
}

export default SkillViewerCatalog

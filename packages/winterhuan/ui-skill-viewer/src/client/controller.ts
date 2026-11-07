/**
 * Skill viewer controller, browser half: the panel's viewing state plus a
 * session-keyed catalog cache over the `skillViewer` Remote.
 *
 * Catalog fetches are cached per session with a single-flight fetch each
 * (the ui-skill twin): opening the panel replays the settled snapshot
 * locally, so one session costs one list RPC. A preset switch drops that
 * session's entries (the catalog belongs to the preset), and a reconnect
 * clears everything. A shared in-flight fetch outlives any single panel
 * interaction: closing the panel must not kill a fetch a reopen will hit,
 * so each fetch carries its own abort (fired only on invalidation and
 * teardown) while a superseded caller just yields. Loaded bodies cache per
 * session and name the same way.
 *
 * Session switches mid-flight never paint a stale session's data: every
 * settlement checks the currently addressable session first.
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type {
  SkillViewerEntry,
  SkillViewerGetValue,
  SkillViewerListValue,
  SkillViewerReferenceRequest,
  SkillViewerReferenceValue,
} from '@winterhuan/dsh-skill-viewer/types'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { rankByName } from '@deepseek-ai/dsh-client-ui-primitives'

/** Minimal Remote face the controller drives (the generated namespace contribution). */
export interface SkillViewerRemote {
  /** List user-invocable skills with source metadata for one session. */
  listDetails(
    request: { readonly sessionId: SessionId },
    signal?: AbortSignal,
  ): Promise<RemoteResult<SkillViewerListValue>>
  /** Load one skill body for viewer presentation. */
  get(
    request: { readonly sessionId: SessionId; readonly name: string },
    signal?: AbortSignal,
  ): Promise<RemoteResult<SkillViewerGetValue>>
  /** Read one local reference of the selected skill. */
  readReference(request: SkillViewerReferenceRequest, signal?: AbortSignal): Promise<RemoteResult<SkillViewerReferenceValue>>
}

/**
 * One Session list row, narrowed to what scoping the viewer needs.
 *
 * Reference labels are owned by their declaring consumers, so the counts are
 * read by name here: the shell's `mainView` claim is what marks the Session a
 * root-scoped surface is showing.
 */
interface SkillViewerSessionRow {
  readonly id: SessionId
  readonly retainedBy: Readonly<Record<string, number | undefined>>
}

/** Minimal sessions face: the shown Session plus child addressing. */
export interface SkillViewerSessions {
  /** List snapshot store carrying every row's local retain counts. */
  readonly list: {
    getSnapshot(): { readonly byId: Readonly<Record<SessionId, SkillViewerSessionRow>> }
    subscribe(listener: () => void): () => void
  }
  /** Child route for a session id, or undefined for an ordinary session. */
  subagentAddress(sessionId: SessionId): unknown
}

/** List fetch lifecycle. */
export type SkillViewerListStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Selected skill detail lifecycle. */
export interface SkillViewerDetailState {
  /** Selected skill name. */
  readonly name: string
  /** Detail fetch lifecycle. */
  readonly status: 'loading' | 'ready' | 'error'
  /** Loaded body; null until settled. */
  readonly value: SkillViewerGetValue | null
  /** Failure text; null unless the load failed. */
  readonly error: string | null
}

/** One reference preview, owned by the current selection. */
export interface SkillViewerReferenceState {
  /** Relative path under the selected skill's references directory. */
  readonly path: string
  /** Preview request lifecycle. */
  readonly status: 'loading' | 'ready' | 'error'
  /** Loaded text and truncation metadata. */
  readonly value: SkillViewerReferenceValue | null
  /** Displayable read failure. */
  readonly error: string | null
}

/** Complete viewer panel state. */
export interface SkillViewerState {
  /** Whether the panel is showing. */
  readonly open: boolean
  /** Current search text. */
  readonly query: string
  /** List fetch lifecycle. */
  readonly status: SkillViewerListStatus
  /** User-invocable skills of the backing session. */
  readonly skills: readonly SkillViewerEntry[]
  /** Whether a provider observation was incomplete. */
  readonly stale: boolean
  /** List failure text; null unless the list failed. */
  readonly error: string | null
  /** Whether an addressable session backs the view. */
  readonly scoped: boolean
  /** Selected skill detail; null on the list. */
  readonly detail: SkillViewerDetailState | null
  /** Reference currently replacing the skill instructions, or null for the instructions themselves. */
  readonly reference: SkillViewerReferenceState | null
}

/** Initial panel state: closed with nothing fetched. */
const INITIAL: SkillViewerState = {
  open: false,
  query: '',
  status: 'idle',
  skills: [],
  stale: false,
  error: null,
  scoped: false,
  detail: null,
  reference: null,
}

/** One session's list fetch: the shared promise plus its own abort handle. */
interface ListFetch {
  readonly promise: Promise<SkillViewerListValue>
  readonly abort: AbortController
  /** Settled catalog for synchronous cache reads (unset while in flight or on failure). */
  settled?: SkillViewerListValue
}

/** One skill's body fetch: the shared promise plus its own abort handle. */
interface BodyFetch {
  readonly promise: Promise<SkillViewerGetValue>
  readonly abort: AbortController
  /** Settled body for synchronous cache reads (unset while in flight or on failure). */
  settled?: SkillViewerGetValue
}

/**
 * Render an arbitrary Remote failure as diagnostic text. A non-Error
 * rejection carries nothing displayable; the panel substitutes its
 * localized unknown-failure line for the null return.
 */
function failureText(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}

/**
 * Rank skill names first, followed by entries matching their description or origin.
 * @param skills - current session's catalog.
 * @param query - case-insensitive name or metadata search.
 * @returns matching entries without duplicates, preserving catalog order after name matches.
 */
export function searchSkills(skills: readonly SkillViewerEntry[], query: string): SkillViewerEntry[] {
  const text = query.trim().toLowerCase()
  const names = rankByName(skills, text)
  const matched = new Set(names.map(skill => skill.name))
  return [...names, ...skills.filter(skill => !matched.has(skill.name)
    && [skill.description, skill.whenToUse, skill.source, skill.provider].some(value => value?.toLowerCase().includes(text)))]
}

/** Panel controller: viewing state plus session-keyed Remote caches. */
export class SkillViewerController {
  /** Panel snapshot the renderer subscribes to. */
  readonly store: SnapshotStore<SkillViewerState> = createSnapshotStore(INITIAL)

  /** Session-keyed list fetches; single-flight per key. */
  private readonly lists = new Map<SessionId, ListFetch>()
  /** Session-and-name-keyed body fetches; single-flight per key. */
  private readonly bodies = new Map<string, BodyFetch>()
  /** Session subscription teardown. */
  private readonly offSessions: () => void
  private selectionVersion = 0
  private listVersion = 0
  private referenceRead: AbortController | undefined
  private viewedSession: SessionId | undefined

  /**
   * @param remote - the mounted skillViewer namespace contribution.
   * @param sessions - current selection and child addressing.
   */
  constructor(
    private readonly remote: SkillViewerRemote,
    private readonly sessions: SkillViewerSessions,
  ) {
    this.offSessions = sessions.list.subscribe(() => { this.refreshOnSessionChange() })
  }

  /** Abort in-flight fetches and release the session subscription. */
  dispose(): void {
    this.selectionVersion += 1
    this.listVersion += 1
    this.cancelReference()
    this.offSessions()
    for (const entry of this.lists.values()) entry.abort.abort()
    this.lists.clear()
    for (const entry of this.bodies.values()) entry.abort.abort()
    this.bodies.clear()
  }

  /** Show the panel, loading the current session's catalog when uncached. */
  open(): void {
    const selected = this.addressable() === this.viewedSession ? this.store.getSnapshot().detail?.name : undefined
    this.selectionVersion += 1
    this.cancelReference()
    this.set({ open: true, detail: null, reference: null })
    this.ensureList(true, selected)
  }

  /** Hide the panel; settled caches survive for the next open. */
  close(): void {
    this.selectionVersion += 1
    this.cancelReference()
    this.set({ open: false, reference: null })
  }

  /**
   * Update the search text.
   * @param query - raw search input.
   */
  setQuery(query: string): void {
    this.set({ query })
  }

  /** Reload the current session's catalog, bypassing its cache. */
  retry(): void {
    const sessionId = this.addressable()
    const selected = this.store.getSnapshot().detail?.name
    if (sessionId !== undefined) this.invalidateSession(sessionId)
    this.selectionVersion += 1
    this.cancelReference()
    this.set({ reference: null })
    this.ensureList(true, selected)
  }

  /**
   * Show one skill's detail, loading its body when uncached.
   * @param name - exact skill name from the viewer list.
   */
  select(name: string): void {
    const sessionId = this.addressable()
    if (sessionId === undefined) return
    const selectionVersion = ++this.selectionVersion
    this.cancelReference()
    const settled = this.bodies.get(`${sessionId}/${name}`)?.settled
    if (settled !== undefined) {
      this.set({ detail: { name, status: 'ready', value: settled, error: null }, reference: null })
      return
    }
    this.set({ detail: { name, status: 'loading', value: null, error: null }, reference: null })
    void this.fetchBody(sessionId, name).then(
      (value) => {
        if (this.selectionVersion !== selectionVersion) return
        if (this.addressable() !== sessionId) return
        this.set({ detail: { name, status: 'ready', value, error: null } })
      },
      (error: unknown) => {
        if (this.selectionVersion !== selectionVersion) return
        if (this.addressable() !== sessionId) return
        this.set({ detail: { name, status: 'error', value: null, error: failureText(error) } })
      },
    )
  }

  /** Return from a reference to its skill, or from the skill to the list. */
  back(): void {
    this.selectionVersion += 1
    this.cancelReference()
    if (this.store.getSnapshot().reference !== null) {
      this.set({ reference: null })
      return
    }
    this.set({ detail: null })
  }

  /**
   * Read a reference without invoking a model tool or changing the selected skill.
   * @param path - reference path supplied by the skill's listing; empty selects its instructions.
   */
  selectReference(path: string): void {
    this.cancelReference()
    if (path === '') {
      this.set({ reference: null })
      return
    }
    const sessionId = this.addressable()
    const detail = this.store.getSnapshot().detail
    if (sessionId === undefined || detail?.status !== 'ready') return
    const read = new AbortController()
    this.referenceRead = read
    this.set({ reference: { path, status: 'loading', value: null, error: null } })
    const current = (): boolean => this.referenceRead === read && this.addressable() === sessionId
      && this.store.getSnapshot().detail?.name === detail.name
    void this.remote.readReference({ sessionId, name: detail.name, path }, read.signal).then(
      (result) => {
        if (!current()) return
        this.referenceRead = undefined
        this.set({ reference: result.ok
          ? { path, status: 'ready', value: result.value, error: null }
          : { path, status: 'error', value: null, error: `skillViewer/readReference failed: ${result.error.code}: ${result.error.message}` } })
      },
      (error: unknown) => {
        if (!current()) return
        this.referenceRead = undefined
        this.set({ reference: { path, status: 'error', value: null, error: failureText(error) } })
      },
    )
  }

  private cancelReference(): void {
    this.referenceRead?.abort()
    this.referenceRead = undefined
  }

  /**
   * Drop cached entries, optionally scoped to one session.
   * @param sessionId - session whose entries to drop; omitted drops everything.
   */
  invalidate(sessionId?: SessionId): void {
    const affectsCurrent = sessionId === undefined || sessionId === this.addressable()
    if (sessionId === undefined) {
      for (const entry of this.lists.values()) entry.abort.abort()
      this.lists.clear()
      for (const entry of this.bodies.values()) entry.abort.abort()
      this.bodies.clear()
    } else {
      this.invalidateSession(sessionId)
    }
    if (!affectsCurrent) return
    this.selectionVersion += 1
    this.cancelReference()
    this.set({ detail: null, reference: null })
    if (this.store.getSnapshot().open) this.ensureList(true)
  }

  /** Reload the list when the current session changed under an open panel. */
  private refreshOnSessionChange(): void {
    if (!this.store.getSnapshot().open) return
    if (this.addressable() === this.viewedSession) return
    this.selectionVersion += 1
    this.cancelReference()
    this.set({ detail: null, reference: null })
    this.ensureList(true)
  }

  /**
   * Session backing the viewer, or undefined for blank and child views.
   *
   * The shown Session is the one the shell's main view retains: Host-owned
   * navigation publishes no single selection for a root-scoped surface to read,
   * so the retain claim is the address.
   */
  private addressable(): SessionId | undefined {
    const byId = this.sessions.list.getSnapshot().byId
    const current = Object.values(byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id
    if (current === undefined) return undefined
    if (this.sessions.subagentAddress(current) !== undefined) return undefined
    return current
  }

  /** Load the current session's catalog from cache or the Remote. */
  private ensureList(selectDefault = false, selected?: string): void {
    const listVersion = ++this.listVersion
    const selectionVersion = this.selectionVersion
    const sessionId = this.addressable()
    if (sessionId !== this.viewedSession) this.set({ skills: [], stale: false })
    this.viewedSession = sessionId
    if (sessionId === undefined) {
      this.set({
        status: 'ready', skills: [], stale: false, error: null, scoped: false,
      })
      return
    }
    const cached = this.lists.get(sessionId)?.settled
    const publish = (value: SkillViewerListValue): void => {
      this.set({ status: 'ready', skills: value.skills, stale: value.stale, error: null, scoped: true })
      const state = this.store.getSnapshot()
      if (!selectDefault || !state.open || (selected === undefined && state.detail !== null) || this.selectionVersion !== selectionVersion) return
      const first = value.skills.find(skill => skill.name === selected) ?? searchSkills(value.skills, state.query)[0]
      if (first !== undefined) this.select(first.name)
      else this.set({ detail: null, reference: null })
    }
    if (cached !== undefined) {
      publish(cached)
      return
    }
    this.set({ status: 'loading', error: null, scoped: true })
    void this.fetchList(sessionId).then(
      (value) => {
        if (this.listVersion !== listVersion) return
        if (this.addressable() !== sessionId) return
        publish(value)
      },
      (error: unknown) => {
        if (this.listVersion !== listVersion) return
        if (this.addressable() !== sessionId) return
        this.set({
          status: 'error', error: failureText(error), scoped: true,
        })
      },
    )
  }

  /** Session-keyed single-flight list fetch recording its settled value. */
  private fetchList(sessionId: SessionId): Promise<SkillViewerListValue> {
    const existing = this.lists.get(sessionId)
    if (existing !== undefined) return existing.promise
    const abort = new AbortController()
    const promise = (async (): Promise<SkillViewerListValue> => {
      const result = await this.remote.listDetails({ sessionId }, abort.signal)
      if (!result.ok) {
        throw new Error(`skillViewer/listDetails failed: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    })()
    const entry: ListFetch = { promise, abort }
    this.lists.set(sessionId, entry)
    void promise.then(
      (value) => { entry.settled = value },
      // A failed fetch must not poison the key: the next opener retries.
      () => { if (this.lists.get(sessionId) === entry) this.lists.delete(sessionId) },
    )
    return promise
  }

  /** Session-and-name-keyed single-flight body fetch recording its settled value. */
  private fetchBody(sessionId: SessionId, name: string): Promise<SkillViewerGetValue> {
    const key = `${sessionId}/${name}`
    const existing = this.bodies.get(key)
    if (existing !== undefined) return existing.promise
    const abort = new AbortController()
    const promise = (async (): Promise<SkillViewerGetValue> => {
      const result = await this.remote.get({ sessionId, name }, abort.signal)
      if (!result.ok) {
        throw new Error(`skillViewer/get failed: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    })()
    const entry: BodyFetch = { promise, abort }
    this.bodies.set(key, entry)
    void promise.then(
      (value) => { entry.settled = value },
      // A failed fetch must not poison the key: the next selection retries.
      () => { if (this.bodies.get(key) === entry) this.bodies.delete(key) },
    )
    return promise
  }

  /** Abort and drop one session's cached entries. */
  private invalidateSession(sessionId: SessionId): void {
    const list = this.lists.get(sessionId)
    if (list !== undefined) {
      this.lists.delete(sessionId)
      list.abort.abort()
    }
    for (const [key, entry] of this.bodies) {
      if (key.startsWith(`${sessionId}/`)) {
        this.bodies.delete(key)
        entry.abort.abort()
      }
    }
  }

  /** Replace the panel snapshot wholesale. */
  private set(patch: Partial<SkillViewerState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }
}

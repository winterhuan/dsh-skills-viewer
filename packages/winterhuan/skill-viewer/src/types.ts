/** Browser-safe wire vocabulary for the skill-viewer Remote namespace. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The addressed Session cannot be inspected. */
    'skillViewer/session-not-found': { readonly sessionId: SessionId }
    /** No user-invocable skill with this name is available to the Session. */
    'skillViewer/unknown-skill': { readonly sessionId: SessionId; readonly name: string }
    /** A reference is absent, outside the allowed directory, or cannot be shown as text. */
    'skillViewer/reference-unavailable': { readonly path: string }
  }
}

/** Session-addressed request for the viewer skill list. */
export interface SkillViewerListRequest {
  /** Session whose cwd and preset select the catalog view. */
  readonly sessionId: SessionId
}

/** One user-invocable skill as the viewer presents it. */
export interface SkillViewerEntry {
  /** Kebab-case identifier. */
  readonly name: string
  /** Short routing description. */
  readonly description: string
  /** Optional extra routing guidance. */
  readonly whenToUse?: string
  /** Whether the same skill is also advertised to the model. */
  readonly modelInvocable: boolean
  /** Always true: the viewer only serves the human surface. */
  readonly userInvocable: true
  /** Discovery source that produced the winning skill. */
  readonly source: string
  /** Provider that owns the skill body. */
  readonly provider: string
}

/** Viewer skill list with provider-completeness state. */
export interface SkillViewerListValue {
  /** User-invocable skills visible through the Session composition, sorted by name. */
  readonly skills: readonly SkillViewerEntry[]
  /**
   * Whether a provider observation was incomplete. An incomplete list keeps
   * whatever the registry could collect; callers present it as last-good
   * coverage rather than an authoritative catalog.
   */
  readonly stale: boolean
}

/** Session-addressed request for one skill body. */
export interface SkillViewerGetRequest {
  /** Session whose cwd and preset select the catalog view. */
  readonly sessionId: SessionId
  /** Exact skill name from the viewer list. */
  readonly name: string
}

/** Provider-specific base used to resolve relative skill resources. */
export type SkillViewerResourceBase =
  | { readonly kind: 'directory'; readonly path: string }
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'opaque'; readonly description: string }

/** Local reference files discovered under one skill's resource directory. */
export interface SkillViewerReferences {
  /** Sorted, slash-separated paths under references/; symbolic links and hidden entries are omitted. */
  readonly files: readonly string[]
  /** Whether the discovery budget prevented a complete listing. */
  readonly truncated: boolean
}

/** Request for one reference belonging to the Session's selected skill. */
export interface SkillViewerReferenceRequest extends SkillViewerGetRequest {
  /** Slash-separated path under references/, as returned by get. */
  readonly path: string
}

/** Bounded UTF-8 preview of a skill reference. */
export interface SkillViewerReferenceValue {
  /** Requested path relative to the skill resource directory. */
  readonly path: string
  /** Text read from the file, with an incomplete trailing code point omitted when truncated. */
  readonly content: string
  /** File size observed before reading, in bytes. */
  readonly bytes: number
  /** Whether content is only the configured prefix of the file. */
  readonly truncated: boolean
}

/** One loaded skill with its body for viewer presentation. */
export interface SkillViewerGetValue {
  /** Kebab-case identifier. */
  readonly name: string
  /** Short routing description. */
  readonly description: string
  /** Optional extra routing guidance. */
  readonly whenToUse?: string
  /** Whether the same skill is also advertised to the model. */
  readonly modelInvocable: boolean
  /** Always true: the viewer only serves the human surface. */
  readonly userInvocable: true
  /** Discovery source that produced the winning skill. */
  readonly source: string
  /** Provider that owns the skill body. */
  readonly provider: string
  /** Absolute file path when the skill came from disk. */
  readonly path?: string
  /** Provider-specific base for relative resources. */
  readonly resourceBase?: SkillViewerResourceBase
  /** Markdown instruction body. */
  readonly content: string
  /** Local reference listing, or null when the provider supplies no absolute local directory. */
  readonly references: SkillViewerReferences | null
}

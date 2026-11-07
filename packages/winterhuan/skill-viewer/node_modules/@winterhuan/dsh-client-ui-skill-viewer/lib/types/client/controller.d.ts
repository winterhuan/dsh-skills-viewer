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
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client';
import type { SkillViewerEntry, SkillViewerGetValue, SkillViewerListValue, SkillViewerReferenceRequest, SkillViewerReferenceValue } from '@winterhuan/dsh-skill-viewer/types';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
/** Minimal Remote face the controller drives (the generated namespace contribution). */
export interface SkillViewerRemote {
    /** List user-invocable skills with source metadata for one session. */
    listDetails(request: {
        readonly sessionId: SessionId;
    }, signal?: AbortSignal): Promise<RemoteResult<SkillViewerListValue>>;
    /** Load one skill body for viewer presentation. */
    get(request: {
        readonly sessionId: SessionId;
        readonly name: string;
    }, signal?: AbortSignal): Promise<RemoteResult<SkillViewerGetValue>>;
    /** Read one local reference of the selected skill. */
    readReference(request: SkillViewerReferenceRequest, signal?: AbortSignal): Promise<RemoteResult<SkillViewerReferenceValue>>;
}
/**
 * One Session list row, narrowed to what scoping the viewer needs.
 *
 * Reference labels are owned by their declaring consumers, so the counts are
 * read by name here: the shell's `mainView` claim is what marks the Session a
 * root-scoped surface is showing.
 */
interface SkillViewerSessionRow {
    readonly id: SessionId;
    readonly retainedBy: Readonly<Record<string, number | undefined>>;
}
/** Minimal sessions face: the shown Session plus child addressing. */
export interface SkillViewerSessions {
    /** List snapshot store carrying every row's local retain counts. */
    readonly list: {
        getSnapshot(): {
            readonly byId: Readonly<Record<SessionId, SkillViewerSessionRow>>;
        };
        subscribe(listener: () => void): () => void;
    };
    /** Child route for a session id, or undefined for an ordinary session. */
    subagentAddress(sessionId: SessionId): unknown;
}
/** List fetch lifecycle. */
export type SkillViewerListStatus = 'idle' | 'loading' | 'ready' | 'error';
/** Selected skill detail lifecycle. */
export interface SkillViewerDetailState {
    /** Selected skill name. */
    readonly name: string;
    /** Detail fetch lifecycle. */
    readonly status: 'loading' | 'ready' | 'error';
    /** Loaded body; null until settled. */
    readonly value: SkillViewerGetValue | null;
    /** Failure text; null unless the load failed. */
    readonly error: string | null;
}
/** One reference preview, owned by the current selection. */
export interface SkillViewerReferenceState {
    /** Relative path under the selected skill's references directory. */
    readonly path: string;
    /** Preview request lifecycle. */
    readonly status: 'loading' | 'ready' | 'error';
    /** Loaded text and truncation metadata. */
    readonly value: SkillViewerReferenceValue | null;
    /** Displayable read failure. */
    readonly error: string | null;
}
/** Complete viewer panel state. */
export interface SkillViewerState {
    /** Whether the panel is showing. */
    readonly open: boolean;
    /** Current search text. */
    readonly query: string;
    /** List fetch lifecycle. */
    readonly status: SkillViewerListStatus;
    /** User-invocable skills of the backing session. */
    readonly skills: readonly SkillViewerEntry[];
    /** Whether a provider observation was incomplete. */
    readonly stale: boolean;
    /** List failure text; null unless the list failed. */
    readonly error: string | null;
    /** Whether an addressable session backs the view. */
    readonly scoped: boolean;
    /** Selected skill detail; null on the list. */
    readonly detail: SkillViewerDetailState | null;
    /** Reference currently replacing the skill instructions, or null for the instructions themselves. */
    readonly reference: SkillViewerReferenceState | null;
}
/**
 * Rank skill names first, followed by entries matching their description or origin.
 * @param skills - current session's catalog.
 * @param query - case-insensitive name or metadata search.
 * @returns matching entries without duplicates, preserving catalog order after name matches.
 */
export declare function searchSkills(skills: readonly SkillViewerEntry[], query: string): SkillViewerEntry[];
/** Panel controller: viewing state plus session-keyed Remote caches. */
export declare class SkillViewerController {
    private readonly remote;
    private readonly sessions;
    /** Panel snapshot the renderer subscribes to. */
    readonly store: SnapshotStore<SkillViewerState>;
    /** Session-keyed list fetches; single-flight per key. */
    private readonly lists;
    /** Session-and-name-keyed body fetches; single-flight per key. */
    private readonly bodies;
    /** Session subscription teardown. */
    private readonly offSessions;
    private selectionVersion;
    private listVersion;
    private referenceRead;
    private viewedSession;
    /**
     * @param remote - the mounted skillViewer namespace contribution.
     * @param sessions - current selection and child addressing.
     */
    constructor(remote: SkillViewerRemote, sessions: SkillViewerSessions);
    /** Abort in-flight fetches and release the session subscription. */
    dispose(): void;
    /** Show the panel, loading the current session's catalog when uncached. */
    open(): void;
    /** Hide the panel; settled caches survive for the next open. */
    close(): void;
    /**
     * Update the search text.
     * @param query - raw search input.
     */
    setQuery(query: string): void;
    /** Reload the current session's catalog, bypassing its cache. */
    retry(): void;
    /**
     * Show one skill's detail, loading its body when uncached.
     * @param name - exact skill name from the viewer list.
     */
    select(name: string): void;
    /** Return from a reference to its skill, or from the skill to the list. */
    back(): void;
    /**
     * Read a reference without invoking a model tool or changing the selected skill.
     * @param path - reference path supplied by the skill's listing; empty selects its instructions.
     */
    selectReference(path: string): void;
    private cancelReference;
    /**
     * Drop cached entries, optionally scoped to one session.
     * @param sessionId - session whose entries to drop; omitted drops everything.
     */
    invalidate(sessionId?: SessionId): void;
    /** Reload the list when the current session changed under an open panel. */
    private refreshOnSessionChange;
    /**
     * Session backing the viewer, or undefined for blank and child views.
     *
     * The shown Session is the one the shell's main view retains: Host-owned
     * navigation publishes no single selection for a root-scoped surface to read,
     * so the retain claim is the address.
     */
    private addressable;
    /** Load the current session's catalog from cache or the Remote. */
    private ensureList;
    /** Session-keyed single-flight list fetch recording its settled value. */
    private fetchList;
    /** Session-and-name-keyed single-flight body fetch recording its settled value. */
    private fetchBody;
    /** Abort and drop one session's cached entries. */
    private invalidateSession;
    /** Replace the panel snapshot wholesale. */
    private set;
}
export {};
//# sourceMappingURL=controller.d.ts.map
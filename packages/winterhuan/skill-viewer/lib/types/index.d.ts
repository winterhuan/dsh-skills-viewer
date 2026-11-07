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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { SkillViewerGetRequest, SkillViewerGetValue, SkillViewerListRequest, SkillViewerListValue, SkillViewerReferenceRequest, SkillViewerReferenceValue } from './types.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host owner of the Session-addressed `skillViewer` Remote namespace. */
        skillViewerCatalog: SkillViewerCatalog;
    }
}
/** Deployment limits for reference discovery and text previews. */
export interface Config {
    /** Maximum directory entries examined while listing one skill's references. */
    readonly maxReferenceEntries?: number;
    /** Maximum UTF-8 bytes returned in one reference preview. */
    readonly maxReferenceBytes?: number;
}
interface ResolvedConfig {
    readonly maxReferenceEntries: number;
    readonly maxReferenceBytes: number;
}
/** Host service backing `ctx.remote.skillViewer` without activating a cold Agent. */
export declare class SkillViewerCatalog extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config, ResolvedConfig>;
    private readonly config;
    /**
     * @param ctx - Host context carrying Session reads and optional skill/preset services.
     * @param config - reference discovery and preview limits, resolved at construction.
     */
    constructor(ctx: Context, config?: Config);
    /**
     * List the user-invocable skills visible to one Session composition, with
     * the source and provider metadata the composer catalog omits.
     * @param request - Session identity whose cwd and preset select the catalog view.
     * @param signal - caller lifetime carried by the Remote transport; admitted catalog reads retain their existing completion semantics.
     * @returns user-invocable skill metadata without bodies, plus whether a provider observation was incomplete.
     * @throws RemoteError when the Session cannot be inspected or no registry can serve it.
     */
    listDetails(request: SkillViewerListRequest, signal: AbortSignal): Promise<SkillViewerListValue>;
    /**
     * Load one user-invocable skill body for viewer presentation.
     * @param request - Session identity selecting the catalog view plus the exact skill name from the viewer list.
     * @param signal - caller lifetime used to cancel reference discovery.
     * @returns the full skill with body content and its local reference listing.
     * @throws RemoteError when the Session cannot be inspected, the name is invalid, or no user-invocable skill with this name is available.
     */
    get(request: SkillViewerGetRequest, signal: AbortSignal): Promise<SkillViewerGetValue>;
    /**
     * Read one local reference of a user-invocable skill without starting an Agent.
     * @param request - Session, skill name, and relative file path under references/.
     * @param signal - caller lifetime used to cancel file reading.
     * @returns a bounded UTF-8 preview with explicit truncation and file-size metadata.
     * @throws RemoteError when the Session or skill is unavailable, the path is unsafe, or the file cannot be read as text.
     */
    readReference(request: SkillViewerReferenceRequest, signal: AbortSignal): Promise<SkillViewerReferenceValue>;
    /** Load the current winning, user-invocable definition under the viewing Session's scope. */
    private definitionOf;
    /**
     * Resolve the workspace, viewing scope, and registry for one Session.
     * A live Agent addresses its own preset layers; a cold Session resolves
     * its recorded preset's standing scope; an unknown preset falls back to
     * the global registry. Nothing here resumes an Agent.
     * @param sessionId - Session identity to inspect.
     * @returns the registry read position for this Session.
     * @throws RemoteError when the Session cannot be inspected or no registry can serve it.
     */
    private viewOf;
}
export default SkillViewerCatalog;
//# sourceMappingURL=index.d.ts.map
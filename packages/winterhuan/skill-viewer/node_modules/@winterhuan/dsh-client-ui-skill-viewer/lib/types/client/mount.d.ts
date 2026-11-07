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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import { type SkillViewerKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The skill viewer panel copy. */
        skillViewer: SkillViewerKey;
    }
}
/** Required services before the `skillViewer` Remote mounts. */
export declare const inject: string[];
/**
 * Mount the plugin's own Remote namespace, since `dsh-api-remotes` lists only harness namespaces.
 * @param ctx - client root context.
 * @param contribution - generated `skillViewer` Remote definitions.
 * @returns disposer joining UI and Remote withdrawal.
 */
export declare function mountSkillViewer(ctx: ClientContext, contribution: TypertRemoteContribution): Promise<() => Promise<void>>;
//# sourceMappingURL=mount.d.ts.map
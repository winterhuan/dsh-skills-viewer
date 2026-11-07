/** Browser entry of the skill viewer: mounts the generated `skillViewer` Remote and the sidebar-foot action. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import skillViewerRemote from '@winterhuan/dsh-skill-viewer/remote'
import { mountSkillViewer } from './mount.ts'

export { inject } from './mount.ts'

/**
 * Activate the skill viewer.
 * @param ctx - client root context.
 * @returns disposer joining UI and Remote withdrawal.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  return await mountSkillViewer(ctx, skillViewerRemote)
}

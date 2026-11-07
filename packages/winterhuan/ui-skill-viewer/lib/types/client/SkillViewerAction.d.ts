import { type ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SkillViewerController } from './controller.ts';
/** Registrant-private injected share of the viewer action. */
export interface SkillViewerActionInjected {
    /** Panel controller owning viewing state and Remote caches. */
    controller: SkillViewerController;
    /** Controller snapshot bound by the UI renderer as useViewer. */
    hooks: {
        viewer: SkillViewerController['store'];
    };
}
/** Footer-action owner share, localized copy, and the registrant's state face. */
export type SkillViewerActionProps = PropsRuntime<'sidebar.footer.action'> & InjectFace<SkillViewerActionInjected> & PropsLocale<'skillViewer'>;
/**
 * Render the sidebar-foot skill entry plus the viewer modal.
 * @param props - foot owner props, localized copy, and injected viewer state.
 * @returns the action button and the modal tree.
 */
export declare function SkillViewerAction({ wide, controller, useViewer, t, }: SkillViewerActionProps): ReactNode;
//# sourceMappingURL=SkillViewerAction.d.ts.map
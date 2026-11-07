import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { SkillViewerState } from './controller.ts';
/** Plain-data props of the viewer panel: snapshot plus intent callbacks. */
export interface SkillViewerPanelProps extends PropsLocale<'skillViewer'> {
    /** Current panel snapshot. */
    state: SkillViewerState;
    /** Search text changed. */
    onQuery: (query: string) => void;
    /** List reload requested. */
    onRetry: () => void;
    /** Skill row picked. */
    onSelect: (name: string) => void;
    /** Detail back navigation requested. */
    onBack: () => void;
    /** Reference file or the skill instructions selected. */
    onReference: (path: string) => void;
}
/**
 * Render the searchable catalog alongside a reader, with single-pane navigation on narrow screens.
 * @param props - panel snapshot, copy, and intent callbacks.
 * @returns the panel tree.
 */
export declare function SkillViewerPanel({ state, t, onQuery, onRetry, onSelect, onBack, onReference }: SkillViewerPanelProps): ReactNode;
//# sourceMappingURL=SkillViewerPanel.d.ts.map
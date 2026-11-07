import { useEffect, useRef, type ReactNode } from 'react'
import { Button, IconCloseOutlineRegular, IconSkillOutlineRegular, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-sidebar's SlotMap merge (the 'sidebar.footer.action'
// entry) into every program that sees this contract.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { SkillViewerController } from './controller.ts'
import { SkillViewerPanel } from './SkillViewerPanel.tsx'
import css from './SkillViewerAction.module.css'

/** Registrant-private injected share of the viewer action. */
export interface SkillViewerActionInjected {
  /** Panel controller owning viewing state and Remote caches. */
  controller: SkillViewerController
  /** Controller snapshot bound by the UI renderer as useViewer. */
  hooks: { viewer: SkillViewerController['store'] }
}

/** Footer-action owner share, localized copy, and the registrant's state face. */
export type SkillViewerActionProps =
  PropsRuntime<'sidebar.footer.action'>
  & InjectFace<SkillViewerActionInjected>
  & PropsLocale<'skillViewer'>

/**
 * Render the sidebar-foot skill entry plus the viewer modal.
 * @param props - foot owner props, localized copy, and injected viewer state.
 * @returns the action button and the modal tree.
 */
export function SkillViewerAction({
  wide, controller, useViewer, t,
}: SkillViewerActionProps): ReactNode {
  const state = useViewer(viewer => viewer)
  const action = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!state.open) return
    return () => { action.current?.focus() }
  }, [state.open])
  return (
    <>
      <Tooltip label={t('action.label')} delayMs={500} disabled={wide}>
        <button
          ref={action}
          type="button"
          className={css.action}
          aria-label={t('action.label')}
          onClick={() => { controller.open() }}
        >
          <IconSkillOutlineRegular size={wide ? 14 : 18} />
          {wide ? <span className={css.label}>{t('action.label')}</span> : null}
        </button>
      </Tooltip>
      <Modal
        open={state.open}
        onClose={() => { controller.close() }}
        title={t('panel.title')}
        headless
        className={css.modal as string}
      >
        <div className={css.header}>
          <div>
            <h2 className={css.title}>{t('panel.title')}</h2>
            <p className={css.description}>{t('panel.description')}</p>
          </div>
          <Button
            className={css.close}
            aria-label={t('panel.close')}
            icon={<IconCloseOutlineRegular />}
            onClick={() => { controller.close() }}
          />
        </div>
        <SkillViewerPanel
          state={state}
          t={t}
          onQuery={(query) => { controller.setQuery(query) }}
          onRetry={() => { controller.retry() }}
          onSelect={(name) => { controller.select(name) }}
          onBack={() => { controller.back() }}
          onReference={(path) => { controller.selectReference(path) }}
        />
      </Modal>
    </>
  )
}

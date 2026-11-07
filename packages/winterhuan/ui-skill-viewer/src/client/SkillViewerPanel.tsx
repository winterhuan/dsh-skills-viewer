import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Input, IconLoadingOutlineRegular, MarkdownText, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SkillViewerGetValue } from '@winterhuan/dsh-skill-viewer/types'
import type { SkillViewerReferenceState, SkillViewerState } from './controller.ts'
import { searchSkills } from './controller.ts'
import css from './SkillViewerPanel.module.css'

/** Plain-data props of the viewer panel: snapshot plus intent callbacks. */
export interface SkillViewerPanelProps extends PropsLocale<'skillViewer'> {
  /** Current panel snapshot. */
  state: SkillViewerState
  /** Search text changed. */
  onQuery: (query: string) => void
  /** List reload requested. */
  onRetry: () => void
  /** Skill row picked. */
  onSelect: (name: string) => void
  /** Detail back navigation requested. */
  onBack: () => void
  /** Reference file or the skill instructions selected. */
  onReference: (path: string) => void
}

/** Provider resource base rendered as one verbatim line. */
function resourceLine(value: NonNullable<SkillViewerGetValue['resourceBase']>): string {
  if (value.kind === 'directory') return value.path
  if (value.kind === 'url') return value.url
  return value.description
}

/**
 * Render one list row: name, badges, description, and source metadata.
 * @param props - row entry plus selection callback and copy.
 * @returns the row button.
 */
function SkillRow({ name, description, modelInvocable, source, provider, selected, t, onSelect }: {
  name: string
  description: string
  modelInvocable: boolean
  source: string
  provider: string
  selected: boolean
  t: SkillViewerPanelProps['t']
  onSelect: (name: string) => void
}): ReactNode {
  return (
    <li key={name} className={css.row}>
      <button type="button" className={css.rowButton} aria-current={selected ? 'true' : undefined} onClick={() => { onSelect(name) }}>
        <span className={css.rowTitle}>
          <code className={css.name}>{name}</code>
          {modelInvocable ? null : <span className={css.badge}>{t('row.userOnly')}</span>}
        </span>
        <span className={css.description}>{description}</span>
        <span className={css.meta}>{`${source} · ${provider}`}</span>
      </button>
    </li>
  )
}

/**
 * Render the searchable catalog alongside a reader, with single-pane navigation on narrow screens.
 * @param props - panel snapshot, copy, and intent callbacks.
 * @returns the panel tree.
 */
export function SkillViewerPanel({ state, t, onQuery, onRetry, onSelect, onBack, onReference }: SkillViewerPanelProps): ReactNode {
  const detail = state.detail
  const matches = searchSkills(state.skills, state.query)
  return (
    <div className={css.panel} data-detail={detail !== null || undefined}>
      <div className={css.catalog}>
        {state.scoped ? (
          <div className={css.search}>
            <Input
              className={css.searchInput as string}
              autoFocus
              aria-label={t('search.label')}
              placeholder={t('search.placeholder')}
              value={state.query}
              onChange={(event) => { onQuery(event.target.value) }}
            />
            <div className={css.catalogActions}>
              <span className={css.hint} role="status">{t('list.count', { count: matches.length, total: state.skills.length })}</span>
              {state.query ? <button type="button" className={css.textButton} onClick={() => { onQuery('') }}>{t('search.clear')}</button> : null}
              <button type="button" className={css.textButton} disabled={state.status === 'loading'} onClick={onRetry}>{t('list.refresh')}</button>
            </div>
          </div>
        ) : null}
        <div className={css.catalogScroll}>
          {state.status === 'idle' || state.status === 'loading' ? (
            <div className={css.loading} role="status" aria-label={t('list.loading')}><IconLoadingOutlineRegular className={css.spinner} /></div>
          ) : null}
          {state.status === 'error' ? (
            <div className={css.errorBlock} role="alert">
              <p className={css.error}>{`${t('list.error')}：${state.error ?? t('error.unknown')}`}</p>
              <button type="button" className={css.retry} onClick={onRetry}>{t('list.retry')}</button>
            </div>
          ) : null}
          {state.status === 'ready' || state.skills.length > 0 ? (
            <>
              {state.stale ? <p className={css.stale}>{t('list.stale')}</p> : null}
              {state.skills.length === 0 ? (
                <div className={css.empty}>
                  <p className={css.status}>{t('list.empty')}</p>
                  {state.scoped ? null : <p className={css.hint}>{t('list.emptyHint')}</p>}
                </div>
              ) : matches.length === 0 ? (
                <p className={css.status}>{t('list.noResults')}</p>
              ) : (
                <ul className={css.list}>
                  {matches.map(skill => (
                    <SkillRow
                      key={skill.name}
                      name={skill.name}
                      description={skill.description}
                      modelInvocable={skill.modelInvocable}
                      source={skill.source}
                      provider={skill.provider}
                      selected={detail?.name === skill.name}
                      t={t}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
      <div className={css.reader}>
        {detail === null ? (
          <p className={css.selectionHint}>{t('detail.empty')}</p>
        ) : (
          <>
            <div className={css.detailHeader}>
              <button type="button" className={state.reference === null ? css.back : css.referenceBack} onClick={onBack}>
                {t(state.reference === null ? 'detail.back' : 'reference.back')}
              </button>
              <h2 className={css.detailName}><code>{detail.name}</code></h2>
            </div>
            {detail.status === 'loading' ? <div className={css.loading} role="status" aria-label={t('detail.loading')}><IconLoadingOutlineRegular className={css.spinner} /></div> : null}
            {detail.status === 'error' ? (
              <div className={css.readerStatus} role="alert">
                <p className={css.error}>{`${t('detail.error')}：${detail.error ?? t('error.unknown')}`}</p>
                <button type="button" className={css.retry} onClick={() => { onSelect(detail.name) }}>
                  {t('detail.retry')}
                </button>
              </div>
            ) : null}
            {detail.status === 'ready' && detail.value !== null ? (
              <SkillDetail key={detail.name} value={detail.value} reference={state.reference} onReference={onReference} t={t} />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Render one loaded skill: metadata plus the full instruction body.
 * @param props - loaded skill value and copy.
 * @returns the detail tree.
 */
function SkillDetail({ value, reference, onReference, t }: {
  value: SkillViewerGetValue
  reference: SkillViewerReferenceState | null
  onReference: SkillViewerPanelProps['onReference']
  t: SkillViewerPanelProps['t']
}): ReactNode {
  const [fileQuery, setFileQuery] = useState('')
  const [mode, setMode] = useState<'preview' | 'source'>('preview')
  const id = useId()
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => { if (scroll.current !== null) scroll.current.scrollTop = 0 }, [reference?.path])
  const files = value.references?.files ?? []
  const matches = files.filter(path => path.toLowerCase().includes(fileQuery.trim().toLowerCase()))
  const markdown = reference === null || /\.(md|markdown)$/i.test(reference.path)
  const content = reference === null ? value.content : reference.value?.content ?? ''
  const activeMode = markdown ? mode : 'source'
  return (
    <div ref={scroll} className={css.detail} role="region" aria-label={t('detail.content')} tabIndex={0}>
      <p className={css.description}>{value.description}</p>
      <details className={css.metadata}>
        <summary className={css.metadataHeading}>{t('meta.details')}</summary>
        <dl className={css.metaList}>
          <div className={css.metaRow}>
            <dt>{t('meta.source')}</dt>
            <dd>{value.source}</dd>
          </div>
          <div className={css.metaRow}>
            <dt>{t('meta.provider')}</dt>
            <dd>{value.provider}</dd>
          </div>
          {value.whenToUse === undefined ? null : (
            <div className={css.metaRow}>
              <dt>{t('meta.whenToUse')}</dt>
              <dd>{value.whenToUse}</dd>
            </div>
          )}
          {value.path === undefined ? null : (
            <div className={css.metaRow}>
              <dt>{t('meta.path')}</dt>
              <dd><code>{value.path}</code></dd>
            </div>
          )}
          {value.resourceBase === undefined ? null : (
            <div className={css.metaRow}>
              <dt>{t('meta.resources')}</dt>
              <dd><code>{resourceLine(value.resourceBase)}</code></dd>
            </div>
          )}
        </dl>
      </details>
      <div className={css.references}>
        {value.references === null ? <p className={css.hint}>{t('reference.unavailable')}</p>
          : value.references.files.length === 0 ? null
            : (
              <div className={css.referenceFields}>
                <Input className={css.searchInput as string} aria-label={t('reference.search')} placeholder={t('reference.search')}
                  value={fileQuery} onChange={event => { setFileQuery(event.target.value) }} />
                <label className={css.referenceLabel}>
                  <span>{t('reference.label')}</span>
                  <select className={css.referenceSelect} value={reference?.path ?? ''} onChange={(event) => { onReference(event.target.value) }}>
                    <option value="">{t('reference.instructions')}</option>
                    {reference !== null && !matches.includes(reference.path) ? <option value={reference.path}>{reference.path}</option> : null}
                    {matches.map(path => <option key={path} value={path}>{path}</option>)}
                  </select>
                </label>
                {matches.length === 0 ? <p className={css.hint}>{t('reference.noResults')}</p> : null}
              </div>
            )}
        {value.references?.files.length === 0 && !value.references.truncated ? <p className={css.hint}>{t('reference.empty')}</p> : null}
        {value.references?.truncated === true ? <p className={css.hint}>{t('reference.listTruncated')}</p> : null}
      </div>
      <section className={css.instructions} aria-label={t('detail.instructions')}>
        <div className={css.instructionsHeader}>
          <span>{reference?.path ?? t('detail.instructions')}</span>
          {markdown ? <SegmentedControl id={id} value={mode} onChange={setMode} label={t('detail.view')}
            options={[{ value: 'preview', label: t('detail.preview') }, { value: 'source', label: t('detail.source') }]} /> : null}
        </div>
        {reference?.status === 'loading' ? <div className={css.loading} role="status" aria-label={t('reference.loading')}><IconLoadingOutlineRegular className={css.spinner} /></div> : null}
        {reference?.status === 'error' ? (
          <div className={css.readerStatus} role="alert">
            <p className={css.error}>{`${t('reference.error')}：${reference.error ?? t('error.unknown')}`}</p>
            <button type="button" className={css.retry} onClick={() => { onReference(reference.path) }}>{t('detail.retry')}</button>
          </div>
        ) : null}
        {reference?.value?.truncated === true ? <p className={css.readerStatus}>{t('reference.truncated')}</p> : null}
        {reference === null || reference.status === 'ready'
          ? <div role={markdown ? 'tabpanel' : undefined} id={`${id}-${activeMode}-panel`} aria-labelledby={markdown ? `${id}-${activeMode}` : undefined}>
            {activeMode === 'source' ? <pre className={css.body}>{content}</pre>
              : <div className={css.markdown}><MarkdownText text={content} labels={{
                code: { copyLabel: t('code.copy'), copiedLabel: t('code.copied'), toolbarLabels: {
                  codeLabel: t('code.title'), wrapLabel: t('code.wrap'), unwrapLabel: t('code.unwrap'),
                } }, footnotes: t('detail.footnotes'),
              }} /></div>}
          </div>
          : null}
      </section>
    </div>
  )
}

/**
 * Skills settings section: fetches the current session's user-invocable skill
 * catalog through the existing `skill.list` RPC and renders it as a list. Each
 * row shows the kebab-case name, source-free description, optional
 * `whenToUse` guidance, and a warning badge when the skill is not
 * model-invocable.
 */

import { useEffect, useState } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { SkillEntry, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { en } from './locales.ts'
import styles from './SkillsSection.module.css'

/** Injected dependencies of {@link SkillsSection} (slot `inject`). */
export interface SkillsSectionInjected {
  /** Wire API face the page reads through. */
  api: Pick<IApiClient, 'skills'>
  /** Section copy. */
  t: (key: keyof typeof en) => string
}

/** Props delivered by the settings-section slot outlet. */
export type SkillsSectionProps = PropsRuntime<'settings.section'> & Partial<SkillsSectionInjected>

/** Internal load state. */
type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'list'; skills: readonly SkillEntry[] }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

/** Retry cadence while the Host attaches the selected session. */
const NOT_ATTACHED_RETRY_DELAYS_MS = [300, 1000] as const

/** Business error raised while the selected session is still detached host-side. */
class SessionNotAttachedError extends Error {}

/**
 * Fetch the skill catalog for the given session.
 * @param api - wire API face.
 * @param sessionId - the current session to scope the catalog to.
 * @param signal - abort signal owned by the rendering effect.
 */
async function fetchSkills(
  api: Pick<IApiClient, 'skills'>,
  sessionId: SessionId,
  signal: AbortSignal,
): Promise<readonly SkillEntry[]> {
  const { result } = await api.skills.list({ sessionId }, signal)
  if (!result.ok) {
    const message = `skill.list failed: ${result.error.code}: ${result.error.message}`
    if (result.error.code === 'session-not-found' && result.error.message.includes('not attached')) {
      throw new SessionNotAttachedError(message)
    }
    throw new Error(message)
  }
  return result.value.skills
}

/** Render one skill row. */
function SkillRow({ skill, modelOffLabel }: {
  skill: SkillEntry
  modelOffLabel: string
}): JSX.Element {
  return (
    <div className={styles.row}>
      <div className={styles.rowHeader}>
        <span className={styles.name}>{skill.name}</span>
        {!skill.modelInvocable && (
          <span className={styles.warnBadge}>{modelOffLabel}</span>
        )}
      </div>
      <div className={styles.desc}>{skill.description}</div>
      {skill.whenToUse !== undefined && (
        <div className={styles.whenToUse}>{skill.whenToUse}</div>
      )}
    </div>
  )
}

/** Skills settings page component. */
export function SkillsSection(props: SkillsSectionProps): JSX.Element {
  const { api, useSessions, t } = props
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [retryNonce, setRetryNonce] = useState(0)

  const sessionId: SessionId | undefined = useSessions((sessions) => sessions.current)
  const subagentAddress = useSessions((sessions) => sessions.currentAddress)

  useEffect(() => {
    if (api === undefined || sessionId === undefined || subagentAddress !== undefined) {
      setState({ status: 'empty' })
      return
    }
    let cancelled = false
    const abort = new AbortController()
    const timers: ReturnType<typeof setTimeout>[] = []
    const load = (attempt: number): void => {
      setState({ status: 'loading' })
      fetchSkills(api, sessionId, abort.signal)
        .then((skills) => {
          if (cancelled) return
          setState(skills.length === 0 ? { status: 'empty' } : { status: 'list', skills })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          if (error instanceof SessionNotAttachedError) {
            const delay = NOT_ATTACHED_RETRY_DELAYS_MS[attempt]
            if (delay !== undefined) {
              timers.push(setTimeout(() => {
                if (!cancelled) load(attempt + 1)
              }, delay))
              return
            }
            setState({ status: 'unavailable' })
            return
          }
          const message = error instanceof Error ? error.message : String(error)
          setState({ status: 'error', message })
        })
    }
    load(0)
    return () => {
      cancelled = true
      abort.abort()
      for (const timer of timers) clearTimeout(timer)
    }
  }, [api, sessionId, subagentAddress, retryNonce])

  if (state.status === 'loading') {
    return <div className={styles.placeholder}>{t?.('loading') ?? 'Loading...'}</div>
  }
  if (state.status === 'empty') {
    return <div className={styles.placeholder}>{t?.('empty') ?? 'No skills discovered.'}</div>
  }
  if (state.status === 'unavailable') {
    return (
      <div className={styles.placeholder}>
        <div>{t?.('notAttached') ?? 'This session is not attached yet. Open its conversation, then retry.'}</div>
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => { setRetryNonce(nonce => nonce + 1) }}
        >
          {t?.('retry') ?? 'Retry'}
        </button>
      </div>
    )
  }
  if (state.status === 'error') {
    return <div className={styles.placeholder}>{state.message}</div>
  }

  const skills = state.skills
  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>{t?.('heading') ?? 'Skills'}</h2>
      <p className={styles.description}>{t?.('description') ?? ''}</p>
      <div className={styles.count}>
        {skills.length}
        {t?.('countSuffix') ?? ' skill(s) discovered'}
      </div>
      {skills.map((skill) => (
        <SkillRow
          key={skill.name}
          skill={skill}
          modelOffLabel={t?.('modelOff') ?? 'model: off'}
        />
      ))}
    </div>
  )
}

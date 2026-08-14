// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId, SkillEntry, SubagentAddress } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { SkillsSection } from '../src/client/SkillsSection.tsx'
import type { SkillsSectionProps } from '../src/client/SkillsSection.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

const sessionOne = 'session-one' as SessionId
const sessionTwo = 'session-two' as SessionId
const unusedHook = (() => { throw new Error('unused by SkillsSection') }) as never
const t = (key: keyof typeof en): string => en[key]
type SkillsApi = NonNullable<SkillsSectionProps['api']>['skills']

function useSessionsFor(state: Pick<SessionListState, 'current' | 'currentAddress'>): SnapshotSelectorHook<SessionListState> {
  return selector => selector({
    ids: [],
    byId: {},
    current: state.current,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: state.currentAddress,
  } as SessionListState)
}

function ok(skills: readonly SkillEntry[]) {
  return Promise.resolve({
    rpcId: 'skills' as never,
    result: { ok: true as const, value: { skills } },
  })
}

function mount(options: {
  list?: (payload: { sessionId: SessionId }, signal?: AbortSignal) => ReturnType<SkillsApi['list']>
  current?: SessionId | undefined
  currentAddress?: SubagentAddress
} = {}) {
  const list = vi.fn(options.list ?? (() => ok([])))
  const props: SkillsSectionProps = {
    close: vi.fn(),
    useSessions: useSessionsFor({
      current: Object.hasOwn(options, 'current') ? options.current : sessionOne,
      currentAddress: options.currentAddress,
    }),
    useWorkspaces: unusedHook,
    api: { skills: { list } },
    t,
  }
  const view = render(<SkillsSection {...props} />)
  return { view, list, props }
}

describe('SkillsSection', () => {
  it('fetches the current ordinary session and renders skill summaries', async () => {
    const skills: SkillEntry[] = [
      { name: 'code-review', description: 'Review code changes.', whenToUse: 'Use before merging.', modelInvocable: true },
      { name: 'local-only', description: 'Human-only workflow.', modelInvocable: false },
    ]
    const { list } = mount({ list: () => ok(skills) })

    await screen.findByText('code-review')
    expect(screen.getByText('Review code changes.')).toBeTruthy()
    expect(screen.getByText('Use before merging.')).toBeTruthy()
    expect(screen.getByText('local-only')).toBeTruthy()
    expect(screen.getByText('model: off')).toBeTruthy()
    expect(screen.getByText('2 skill(s) discovered')).toBeTruthy()
    expect(list).toHaveBeenCalledWith({ sessionId: sessionOne }, expect.any(AbortSignal))
  })

  it('shows empty state for an empty catalog', async () => {
    mount({ list: () => ok([]) })

    await screen.findByText('No skills discovered.')
  })

  it('does not call the API without a current session', () => {
    const { list } = mount({ current: undefined })

    expect(screen.getByText('No skills discovered.')).toBeTruthy()
    expect(list).not.toHaveBeenCalled()
  })

  it('does not call the API while a subagent address is selected', () => {
    const { list } = mount({ currentAddress: { parentSessionId: sessionOne, subagentId: 'child' } as unknown as SubagentAddress })

    expect(screen.getByText('No skills discovered.')).toBeTruthy()
    expect(list).not.toHaveBeenCalled()
  })

  it('renders skill.list business errors', async () => {
    mount({ list: () => Promise.resolve({
      rpcId: 'skills' as never,
      result: { ok: false as const, error: { code: 'internal', message: 'boom' } },
    }) })

    await screen.findByText('skill.list failed: internal: boom')
  })

  it('aborts an obsolete request when the current session changes', async () => {
    const requests: Array<{
      sessionId: SessionId
      signal: AbortSignal | undefined
      resolve: (value: Awaited<ReturnType<SkillsApi['list']>>) => void
    }> = []
    const list = vi.fn((payload: { sessionId: SessionId }, signal?: AbortSignal) => new Promise<Awaited<ReturnType<SkillsApi['list']>>>(resolve => {
      requests.push({ sessionId: payload.sessionId, signal, resolve })
    }))
    const props: SkillsSectionProps = {
      close: vi.fn(),
      useSessions: useSessionsFor({ current: sessionOne, currentAddress: undefined }),
      useWorkspaces: unusedHook,
      api: { skills: { list } },
      t,
    }
    const view = render(<SkillsSection {...props} />)
    await waitFor(() => { expect(requests).toHaveLength(1) })

    view.rerender(<SkillsSection
      {...props}
      useSessions={useSessionsFor({ current: sessionTwo, currentAddress: undefined })}
    />)

    await waitFor(() => { expect(requests).toHaveLength(2) })
    expect(requests[0]!.signal?.aborted).toBe(true)
    requests[0]!.resolve({
      rpcId: 'old' as never,
      result: { ok: true as const, value: { skills: [{ name: 'old', description: 'Old.', modelInvocable: true }] } },
    })
    requests[1]!.resolve({
      rpcId: 'new' as never,
      result: { ok: true as const, value: { skills: [{ name: 'new', description: 'New.', modelInvocable: true }] } },
    })

    await screen.findByText('new')
    expect(screen.queryByText('old')).toBeNull()
  })
})

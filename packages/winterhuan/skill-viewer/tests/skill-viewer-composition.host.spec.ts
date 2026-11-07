import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { SessionObservation } from '@deepseek-ai/dsh-session-query'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SkillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import { SkillViewerCatalog } from '../src/index.ts'

let root: string | undefined
let ctx: Context | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  ctx = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

/** Write one directory-bundle skill and return the skills root. */
async function stageSkills(project: string): Promise<string> {
  const skills = join(project, 'skills')
  await mkdir(join(skills, 'demo-viewer'), { recursive: true })
  await writeFile(join(skills, 'demo-viewer', 'SKILL.md'), [
    '---',
    'name: demo-viewer',
    'description: Demonstrate the viewer.',
    'whenToUse: When showcasing skills.',
    '---',
    '',
    '# Demo Viewer',
    '',
    'Follow these steps.',
    '',
  ].join('\n'))
  await mkdir(join(skills, 'demo-viewer', 'references'))
  await writeFile(join(skills, 'demo-viewer', 'references', 'guide.md'), '# Reference guide\n')
  await writeFile(join(skills, 'manual-only.md'), [
    '---',
    'name: manual-only',
    'description: Hand-invoked helper.',
    'disable-model-invocation: true',
    '---',
    '',
    'Manual body.',
    '',
  ].join('\n'))
  return skills
}

describe('skill-viewer real composition', () => {
  it('serves the real registry and filesystem provider without touching the session log', async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-skill-viewer-')))
    const project = root
    const skills = await stageSkills(project)
    const sessionId = SessionId('composed-viewer')

    ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SkillFilesystem, {
      customSkillDirs: [skills],
      includeDefaultRoots: false,
      watch: false,
    })
    const observation = (): SessionObservation => ({
      source: 'live',
      header: {
        version: SESSION_FORMAT_VERSION,
        id: sessionId,
        createdAt: 1,
        cwd: project,
        isSeeded: false,
      },
      events: Object.freeze([]),
      inheritedEventCount: SessionLogOffset(0),
      cursor: -1,
      projections: { asOfSeq: -1, values: {} },
      retain: observation,
      [Symbol.dispose]: () => {},
    })
    ctx.provide('sessionQuery', { observeSession: () => Promise.resolve(observation()) } as never)
    const dispose = (): void => {}
    ctx.provide('typert', {
      lookups: { configure: () => dispose },
      contexts: { configureHost: () => dispose },
    } as never)
    const fiber = ctx.plugin(SkillViewerCatalog)
    await fiber.await()
    expect(ctx.skillViewerCatalog).toBeInstanceOf(SkillViewerCatalog)

    const signal = new AbortController().signal
    await expect(ctx.skillViewerCatalog.listDetails({ sessionId }, signal)).resolves.toEqual({
      skills: [
        {
          name: 'demo-viewer',
          description: 'Demonstrate the viewer.',
          whenToUse: 'When showcasing skills.',
          modelInvocable: true,
          userInvocable: true,
          source: 'custom',
          provider: 'filesystem',
        },
        {
          name: 'manual-only',
          description: 'Hand-invoked helper.',
          modelInvocable: false,
          userInvocable: true,
          source: 'custom',
          provider: 'filesystem',
        },
      ],
      stale: false,
    })

    const loaded = await ctx.skillViewerCatalog.get({ sessionId, name: 'demo-viewer' }, signal)
    expect(loaded).toMatchObject({
      name: 'demo-viewer',
      source: 'custom',
      provider: 'filesystem',
      path: join(skills, 'demo-viewer', 'SKILL.md'),
      resourceBase: { kind: 'directory', path: join(skills, 'demo-viewer') },
    })
    expect(loaded.content).toContain('# Demo Viewer')
    expect(loaded.references).toEqual({ files: ['references/guide.md'], truncated: false })
    await expect(ctx.skillViewerCatalog.readReference({ sessionId, name: 'demo-viewer', path: 'references/guide.md' }, signal))
      .resolves.toMatchObject({ content: '# Reference guide\n', truncated: false })
    await expect(ctx.skillViewerCatalog.readReference({ sessionId, name: 'missing', path: 'references/guide.md' }, signal))
      .rejects.toMatchObject({ code: 'skillViewer/unknown-skill' })
    expect(ctx.agents.list()).toEqual([])

    // Model-disabled skills stay loadable on the human surface; unknown names stay errors.
    await expect(ctx.skillViewerCatalog.get({ sessionId, name: 'manual-only' }, signal))
      .resolves.toMatchObject({ content: expect.stringContaining('Manual body.') as string })
    await expect(ctx.skillViewerCatalog.get({ sessionId, name: 'missing' }, signal))
      .rejects.toMatchObject({ code: 'skillViewer/unknown-skill' })

    await fiber.dispose()
    expect(ctx.get('skillViewerCatalog')).toBeUndefined()
  })
})

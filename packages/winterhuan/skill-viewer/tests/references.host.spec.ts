import * as fs from 'node:fs/promises'
import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { listReferences, readReference } from '../src/references.ts'
import { SkillViewerCatalog } from '../src/index.ts'

vi.mock('node:fs/promises', async importOriginal => ({
  ...await importOriginal<typeof import('node:fs/promises')>(),
}))

afterEach(() => { vi.restoreAllMocks() })

async function fixture(): Promise<string> {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-viewer-reference-'))
  onTestFinished(() => rm(temporary, { recursive: true, force: true }))
  const root = await fs.realpath(temporary)
  await mkdir(join(root, 'references', 'nested'), { recursive: true })
  await writeFile(join(root, 'references', 'guide.md'), '# Guide\n参考内容。\n')
  await writeFile(join(root, 'references', 'nested', 'data.json'), '{"ready":true}\n')
  await writeFile(join(root, 'references', '.hidden'), 'private')
  return root
}

describe('skill reference files', () => {
  it('lists nested visible files and reads their complete text', async () => {
    const root = await fixture()
    const signal = new AbortController().signal
    expect(await listReferences(root, 100, signal)).toEqual({
      files: ['references/guide.md', 'references/nested/data.json'], truncated: false,
    })
    const content = '# Guide\n参考内容。\n'
    expect(await readReference(root, 'references/guide.md', 1024, signal)).toEqual({
      path: 'references/guide.md', content, bytes: Buffer.byteLength(content), truncated: false,
    })
  })

  it('reports a missing references directory as an empty listing', async () => {
    const root = await fixture()
    expect(await listReferences(join(root, 'references', 'nested'), 100, new AbortController().signal))
      .toEqual({ files: [], truncated: false })
  })

  it('reports invalid resource directories instead of hiding filesystem errors', async () => {
    const root = await fixture()
    const file = join(root, 'references', 'guide.md')
    const signal = new AbortController().signal
    await expect(listReferences(join(file, 'child'), 100, signal)).rejects.toMatchObject({ code: 'ENOTDIR' })
    await expect(listReferences(file, 100, signal)).rejects.toMatchObject({ code: 'ENOTDIR' })
    await rm(join(root, 'references'), { recursive: true })
    await writeFile(join(root, 'references'), 'not a directory')
    expect(await listReferences(root, 100, signal)).toEqual({ files: [], truncated: false })
  })

  it.skipIf(process.platform === 'win32')('rejects a reference directory replaced with an outside link after inspection', async () => {
    const root = await fixture()
    const outside = await fixture()
    const references = join(root, 'references')
    const realFs = await vi.importActual<typeof fs>('node:fs/promises')
    vi.spyOn(fs, 'lstat').mockImplementation(async (path, options) => {
      const info = await realFs.lstat(path, options)
      if (path === references) {
        await rename(references, join(root, 'original-references'))
        await symlink(outside, references)
      }
      return info
    })
    await expect(listReferences(root, 100, new AbortController().signal))
      .rejects.toMatchObject({ code: 'skillViewer/reference-unavailable' })
  })

  it('rejects a replaced file and closes the handle opened before replacement', async () => {
    const root = await fixture()
    const target = join(root, 'references', 'guide.md')
    const realFs = await vi.importActual<typeof fs>('node:fs/promises')
    const opened = await realFs.open(target, 'r')
    onTestFinished(() => opened.close())
    vi.spyOn(fs, 'open').mockImplementation(async (path, ...args) => {
      if (path !== target) return realFs.open(path, ...args)
      await rename(target, `${target}.original`)
      await writeFile(target, 'replacement content')
      return opened
    })
    await expect(readReference(root, 'references/guide.md', 1024, new AbortController().signal))
      .rejects.toMatchObject({ code: 'skillViewer/reference-unavailable' })
    await expect(opened.stat()).rejects.toMatchObject({ code: 'EBADF' })
  })

  it('reports a cut discovery and a cut UTF-8 preview explicitly', async () => {
    const root = await fixture()
    await writeFile(join(root, 'references', 'unicode.txt'), '前🙂后')
    const signal = new AbortController().signal
    expect((await listReferences(root, 1, signal)).truncated).toBe(true)
    expect(await readReference(root, 'references/unicode.txt', 5, signal)).toMatchObject({ content: '前', truncated: true })
  })

  it.each(['../outside', '/etc/passwd', 'references/../../outside', 'references\\guide.md', 'references//guide.md', 'references/.hidden', 'scripts/run.py'])(
    'refuses an invalid reference path: %s', async (path) => {
      const root = await fixture()
      await expect(readReference(root, path, 1024, new AbortController().signal)).rejects.toMatchObject({ code: 'gateway/bad-request' })
    },
  )

  it('refuses directories, NUL bytes, and non-UTF-8 content', async () => {
    const root = await fixture()
    await writeFile(join(root, 'references', 'binary.bin'), Buffer.from([0, 1, 2]))
    await writeFile(join(root, 'references', 'invalid.txt'), Buffer.from([255, 254]))
    for (const path of ['references/nested', 'references/binary.bin', 'references/invalid.txt']) {
      await expect(readReference(root, path, 1024, new AbortController().signal))
        .rejects.toMatchObject({ code: 'skillViewer/reference-unavailable' })
    }
  })

  it.skipIf(process.platform === 'win32')('does not list or read symlink targets', async () => {
    const root = await fixture()
    await writeFile(join(root, 'outside.txt'), 'not a reference')
    await symlink(join(root, 'outside.txt'), join(root, 'references', 'linked.txt'))
    await symlink(root, join(root, 'references', 'loop'))
    const signal = new AbortController().signal
    expect((await listReferences(root, 100, signal)).files).not.toContain('references/linked.txt')
    await expect(readReference(root, 'references/linked.txt', 1024, signal))
      .rejects.toMatchObject({ code: 'skillViewer/reference-unavailable' })
    await expect(readReference(root, 'references/loop/outside.txt', 1024, signal))
      .rejects.toMatchObject({ code: 'skillViewer/reference-unavailable' })
  })

  it('honors cancellation before discovery or reading', async () => {
    const root = await fixture()
    const abort = new AbortController()
    abort.abort()
    await expect(listReferences(root, 100, abort.signal)).rejects.toMatchObject({ name: 'AbortError' })
    await expect(readReference(root, 'references/guide.md', 1024, abort.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('validates configured discovery and read limits', () => {
    expect(SkillViewerCatalog.Config({})).toEqual({ maxReferenceEntries: 1000, maxReferenceBytes: 1024 * 1024 })
    for (const value of [0, -1, 1.5, Infinity]) {
      expect(() => SkillViewerCatalog.Config({ maxReferenceBytes: value })).toThrow()
      expect(() => SkillViewerCatalog.Config({ maxReferenceEntries: value })).toThrow()
    }
  })
})

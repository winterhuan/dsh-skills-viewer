/** Bounded local reference discovery and text reads under a provider-selected skill directory. */
import { constants, type Stats } from 'node:fs'
import { lstat, open, opendir, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { SkillViewerReferences, SkillViewerReferenceValue } from './types.ts'

function missing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

function unavailable(path: string, message: string): never {
  throw new RemoteError('skillViewer/reference-unavailable', message, { path })
}

function assertInside(root: string, path: string): void {
  const suffix = relative(root, path)
  if (suffix === '' || suffix === '..' || suffix.startsWith(`..${sep}`) || isAbsolute(suffix)) {
    unavailable(path, 'Reference must remain inside the selected skill directory.')
  }
}

/**
 * Discover regular reference files without following links or traversing hidden entries.
 * @param directory - absolute local resource directory supplied by the skill provider.
 * @param maxEntries - maximum directory entries examined across the traversal.
 * @param signal - cancellation of the viewing request.
 * @returns sorted file paths and whether the entry budget cut the listing.
 * @throws when discovery is cancelled or an existing reference directory cannot be inspected safely.
 */
export async function listReferences(directory: string, maxEntries: number, signal: AbortSignal): Promise<SkillViewerReferences> {
  signal.throwIfAborted()
  let root: string
  try { root = await realpath(directory) }
  catch (error) {
    if (missing(error)) return { files: [], truncated: false }
    throw error
  }
  const pending = ['references']
  const files: string[] = []
  let examined = 0
  let truncated = false
  for (let path = pending.pop(); path !== undefined && !truncated; path = pending.pop()) {
    signal.throwIfAborted()
    const target = join(root, ...path.split('/'))
    let info: Stats
    try { info = await lstat(target) }
    catch (error) {
      if (missing(error)) continue
      throw error
    }
    if (!info.isDirectory() || info.isSymbolicLink()) continue
    assertInside(root, await realpath(target))
    for await (const entry of await opendir(target)) {
      signal.throwIfAborted()
      examined += 1
      if (examined > maxEntries) { truncated = true; break }
      if (entry.name.startsWith('.') || entry.name.includes('\\')) continue
      const child = `${path}/${entry.name}`
      if (entry.isDirectory()) pending.push(child)
      else if (entry.isFile()) files.push(child)
    }
  }
  return { files: files.sort(), truncated }
}

async function referencePath(root: string, path: string): Promise<string> {
  const parts = path.split('/')
  if (parts[0] !== 'references' || parts.length < 2 || path.includes('\\') || path.includes('\0')
    || parts.some(part => part === '' || part.startsWith('.'))) {
    throw new RemoteError('gateway/bad-request', 'Reference path must name a non-hidden file under references/.', {})
  }
  let current = root
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part)
    assertInside(root, current)
    const info = await lstat(current)
    if (info.isSymbolicLink()) unavailable(path, 'Symbolic links are not readable as skill references.')
    if (index === parts.length - 1 ? !info.isFile() : !info.isDirectory()) {
      unavailable(path, 'Reference must be a regular file.')
    }
  }
  const canonical = await realpath(current)
  assertInside(root, canonical)
  return canonical
}

/**
 * Read a bounded UTF-8 prefix from a regular reference file, checking its directory and opened identity.
 * @param directory - absolute local resource directory supplied by the skill provider.
 * @param path - slash-separated relative path under references/.
 * @param maxBytes - maximum bytes in the returned preview.
 * @param signal - cancellation of the viewing request.
 * @returns file text and explicit truncation metadata.
 * @throws RemoteError for an unsafe path, non-regular file, or non-UTF-8 content; filesystem errors remain available to the Remote owner.
 */
export async function readReference(
  directory: string,
  path: string,
  maxBytes: number,
  signal: AbortSignal,
): Promise<SkillViewerReferenceValue> {
  signal.throwIfAborted()
  const root = await realpath(directory)
  const target = await referencePath(root, path)
  const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const info = await file.stat()
    const current = await stat(await referencePath(root, path))
    if (!info.isFile() || info.dev !== current.dev || info.ino !== current.ino) {
      unavailable(path, 'Reference changed while it was being opened.')
    }
    const buffer = Buffer.allocUnsafe(maxBytes + 1)
    let used = 0
    while (used < buffer.length) {
      signal.throwIfAborted()
      const result = await file.read(buffer, used, buffer.length - used, used)
      if (result.bytesRead === 0) break
      used += result.bytesRead
    }
    signal.throwIfAborted()
    const truncated = used > maxBytes
    const bytes = buffer.subarray(0, Math.min(used, maxBytes))
    if (bytes.includes(0)) unavailable(path, 'Reference is not a UTF-8 text file.')
    let content: string
    try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes, { stream: truncated }) }
    catch { unavailable(path, 'Reference is not a UTF-8 text file.') }
    return { path, content, bytes: info.size, truncated }
  } finally {
    await file.close()
  }
}

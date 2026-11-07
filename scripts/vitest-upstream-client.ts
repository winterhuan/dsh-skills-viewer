/**
 * Test-only resolution of DSH client source from the pinned `upstream/` submodule.
 *
 * Published DSH client plugins expose `./client` as a browser module-loader bundle and do not
 * ship `src/`, so Node tests cannot load them from npm. This plugin maps `@deepseek-ai/<pkg>/client`
 * and `@deepseek-ai/<pkg>/src/*` to the same-version upstream source, and resolves those source
 * files' bare imports through pnpm's hidden hoist directory so they share the npm copies the
 * plugin packages use. Builds and type checks never load it.
 */
import { existsSync, globSync, readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vitest/config'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const UPSTREAM = resolve(ROOT, 'upstream')
const HOIST_ANCHOR = resolve(ROOT, 'node_modules/.pnpm/node_modules/.vitest-upstream-anchor.js')
const SOURCE_SUBPATH = /^(@deepseek-ai\/[^/]+)\/(client|src\/.+)$/

/**
 * Locate the source file behind a package's `./client` export through its declared declaration path.
 * @param dir - upstream package directory.
 * @returns the `.ts` or `.tsx` source compiled to that declaration.
 * @throws {Error} when the package declares no `./client` declaration with a matching source file.
 */
function clientSourceEntry(dir: string): string {
  const manifest = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')) as { name: string; exports?: Record<string, { types?: string } | string> }
  const entry = manifest.exports?.['./client']
  const declaration = typeof entry === 'object' ? entry.types : undefined
  const base = declaration === undefined ? undefined : /^\.\/lib\/types\/(.+)\.d\.ts$/.exec(declaration)?.[1]
  for (const extension of ['.ts', '.tsx']) {
    const candidate = base === undefined ? undefined : resolve(dir, 'src', base + extension)
    if (candidate !== undefined && existsSync(candidate)) return candidate
  }
  throw new Error(`vitest: ${manifest.name} has no ./client source entry`)
}

/**
 * Create the upstream client source resolver.
 * @returns a pre-resolution Vite plugin for the unit test configuration.
 * @throws {Error} when the upstream submodule is not checked out.
 */
export function upstreamClientSource(): Plugin {
  const packageDirs = new Map<string, string>()
  for (const manifest of globSync('packages/*/*/package.json', { cwd: UPSTREAM })) {
    const { name } = JSON.parse(readFileSync(resolve(UPSTREAM, manifest), 'utf8')) as { name: string }
    packageDirs.set(name, resolve(UPSTREAM, dirname(manifest)))
  }
  if (packageDirs.size === 0) throw new Error('vitest: upstream/ is empty; run git submodule update --init')
  return {
    name: 'dsh-upstream-client-source',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const match = SOURCE_SUBPATH.exec(source)
      const dir = match === null ? undefined : packageDirs.get(match[1]!)
      if (match !== null && dir !== undefined) return match[2] === 'client' ? clientSourceEntry(dir) : resolve(dir, match[2]!)
      const bare = !source.startsWith('.') && !source.startsWith('/') && !source.startsWith('\0')
      if (bare && importer !== undefined && importer.startsWith(UPSTREAM + sep)) {
        return this.resolve(source, HOIST_ANCHOR, { ...options, skipSelf: true })
      }
      return null
    },
  }
}

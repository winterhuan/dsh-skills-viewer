// The published `@deepseek-ai/dsh-*` client entrypoints ship as browser
// bundles registered through `window.__ModuleLoader__.load(...)`: plain
// ESM imports yield no exports in a node test. Materialize the bundle by
// installing a transient ModuleLoader stub and running its factory against
// this repository's own node_modules.
import { createRequire } from 'node:module'
import { hookCSS } from './css-require.ts'

// Node's ESM loader rejects the `.module.css` imports inside the published
// browser-lib bundles; install the no-op `.css` hook before any factory
// require runs.
hookCSS()

const require_ = createRequire(import.meta.url)

// The locale/runtime factories eagerly require their sibling UI externals
// (the browser runtime normally injects them). The specs only exercise
// SlotRegistry/LocaleRuntime, whose code paths never touch those imports,
// so a stub stands in for any `@deepseek-ai` client package whose ESM tree
// pulls in `.module.css` assets Node will not load.
function bundleRequire(name: string): unknown {
  try {
    return require_(name)
  } catch (error) {
    if (name.startsWith('@deepseek-ai/dsh-client-') && !name.endsWith('/client') && name !== '@deepseek-ai/dsh-client-ui-slots') return {}
    throw error
  }
}
const cache = new Map<string, Record<string, unknown>>()

export function clientBundle(specifier: string): Record<string, unknown> {
  const hit = cache.get(specifier)
  if (hit) return hit
  const g = globalThis as {
    window?: { __ModuleLoader__?: { load(spec: { factory: (req: (n: string) => unknown) => unknown }): void } }
  }
  g.window ??= {}
  let ran: Record<string, unknown> | undefined
  const previous = g.window.__ModuleLoader__
  g.window.__ModuleLoader__ = {
    load({ factory }) { ran = factory(bundleRequire) as Record<string, unknown> },
  }
  try {
    require_(specifier)
  } finally {
    g.window.__ModuleLoader__ = previous
  }
  if (ran === undefined) throw new Error(`bundle registered nothing: ${specifier}`)
  cache.set(specifier, ran)
  return ran
}

// Strip CSS imports from Node's resolver: published client bundles import
// `*.module.css` for the bundler to inline, which a Node test never renders.
import Module from 'node:module'

let installed = false

export function hookCSS(): void {
  if (installed) return
  installed = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions = (Module as any)._extensions as Record<string, unknown>
  extensions['.css'] = (module: { exports: unknown }) => { module.exports = {} }
}

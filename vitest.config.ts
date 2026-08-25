import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'

// One React instance: this package's own, shared with the react-dom the
// specs render through. React aliases come first and anchored, so the bare
// `react` entry cannot swallow the runtime subpaths.
const localRequire = createRequire(import.meta.url)

// The published @deepseek-ai client bundles are window.__ModuleLoader__
// factories for the browser. Specs exercise the classes directly, so resolve
// the `/client` subpaths (and value-level packages whose lib bundles assume a
// browser) to the TS sources each npm package ships under `./src/*` — the
// same semantics the in-harness tsconfig path aliases provided.
const anchor = (spec: string) => new RegExp(`^${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

const ALIASES: [string, string][] = [
  ['react/jsx-dev-runtime', localRequire.resolve('react/jsx-dev-runtime')],
  ['react/jsx-runtime', localRequire.resolve('react/jsx-runtime')],
  ['react', localRequire.resolve('react')],
  ['@deepseek-ai/dsh-client-runtime/client', new URL('./tests/shims/client-runtime-client.ts', import.meta.url).pathname],
  ['@deepseek-ai/dsh-client-locale/client', new URL('./tests/shims/client-locale-client.ts', import.meta.url).pathname],
]

export default defineConfig({
  resolve: {
    alias: ALIASES.map(([spec, replacement]) => ({ find: anchor(spec), replacement })),
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
  },
})

/** Cross-package unit tests; client specs select jsdom with a per-file @vitest-environment pragma. */
import { defineConfig } from 'vitest/config'
import { standardDecoratorPlugin, vitestExecArgv } from './scripts/vitest-shared.ts'
import { upstreamClientSource } from './scripts/vitest-upstream-client.ts'

export default defineConfig({
  plugins: [standardDecoratorPlugin(), upstreamClientSource()],
  test: {
    include: ['packages/*/*/tests/**/*.spec.{ts,tsx}', 'tests/**/*.spec.ts'],
    setupFiles: ['./scripts/test-dom-environment.ts'],
    pool: 'forks',
    execArgv: vitestExecArgv,
    testTimeout: 30_000,
    // DSH client packages import CSS and client source subpaths that only Vite and the plugin above can resolve.
    server: { deps: { inline: [/@deepseek-ai\/dsh-client-/] } },
  },
})

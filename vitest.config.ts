import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const root = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  root,
  plugins: [tsconfigPaths({ projects: ['tsconfig.base.json'] })],
  test: {
    environment: 'node',
    globals: false,
    include: ['custom-plugins/dsh-skills-viewer/tests/**/*.spec.ts', 'custom-plugins/dsh-skills-viewer/tests/**/*.spec.tsx'],
  },
})

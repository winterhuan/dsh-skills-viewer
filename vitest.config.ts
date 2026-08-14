import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const root = fileURLToPath(new URL('../..', import.meta.url))
const react = fileURLToPath(new URL('../../node_modules/.pnpm/react@18.3.1/node_modules/react', import.meta.url))
const reactDom = fileURLToPath(new URL('../../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom', import.meta.url))

export default defineConfig({
  root,
  plugins: [tsconfigPaths({ projects: ['tsconfig.base.json'] })],
  resolve: {
    alias: {
      react,
      'react/jsx-runtime': `${react}/jsx-runtime.js`,
      'react/jsx-dev-runtime': `${react}/jsx-dev-runtime.js`,
      'react-dom': reactDom,
      'react-dom/client': `${reactDom}/client.js`,
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['custom-plugins/dsh-skills-viewer/tests/**/*.spec.ts', 'custom-plugins/dsh-skills-viewer/tests/**/*.spec.tsx'],
  },
})

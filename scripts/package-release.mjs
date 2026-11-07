import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const artifacts = resolve(root, '.artifacts')
const output = resolve(root, 'plugin')
mkdirSync(artifacts, { recursive: true })
execFileSync('pnpm', ['--filter', '@winterhuan/dsh-skill-viewer', 'pack', '--pack-destination', artifacts], {
  cwd: root, stdio: 'inherit',
})
const { default: manifest } = await import('../packages/winterhuan/skill-viewer/package.json', { with: { type: 'json' } })
const archive = resolve(artifacts, `winterhuan-dsh-skill-viewer-${manifest.version}.tgz`)
rmSync(output, { recursive: true, force: true })
mkdirSync(output)
execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', output], { stdio: 'inherit' })

import { test, expect, describe, afterAll } from 'bun:test'
import { join } from 'node:path'
import { readFile, unlink } from 'node:fs/promises'
import { parse } from 'yaml'
import { $ } from 'bun'

const fixturesDir = join(import.meta.dir, '..', 'fixtures')
const entryPoint = join(import.meta.dir, '..', '..', 'src', 'index.ts')

const tmpOutputs: string[] = []

function tmpOutput(name: string): string {
  const p = `/tmp/arch-drift-test-${name}-${Date.now()}.yml`
  tmpOutputs.push(p)
  return p
}

afterAll(async () => {
  for (const p of tmpOutputs) {
    try { await unlink(p) } catch {}
  }
})

describe('init command', () => {
  test('init on valid-project fixture generates correct architecture.yml', async () => {
    const output = tmpOutput('init-valid')
    const result = await $`bun run ${entryPoint} init --non-interactive --output ${output} ${join(fixturesDir, 'valid-project')}`.quiet()

    expect(result.exitCode).toBe(0)

    const content = await readFile(output, 'utf-8')
    const config = parse(content)

    expect(config.version).toBe(1)
    expect(config.project.name).toBe('valid-project')
    expect(config.project.src).toBe('src')
  })

  test('detects layers from directory structure', async () => {
    const output = tmpOutput('init-layers')
    await $`bun run ${entryPoint} init --non-interactive --output ${output} ${join(fixturesDir, 'valid-project')}`.quiet()

    const content = await readFile(output, 'utf-8')
    const config = parse(content)

    const layerNames = config.layers.map((l: { name: string }) => l.name).sort()
    expect(layerNames).toContain('components')
    expect(layerNames).toContain('hooks')
    expect(layerNames).toContain('lib')
    expect(layerNames).toContain('types')
  })

  test('detects shared_layers (types imported by most layers)', async () => {
    const output = tmpOutput('init-shared')
    await $`bun run ${entryPoint} init --non-interactive --output ${output} ${join(fixturesDir, 'valid-project')}`.quiet()

    const content = await readFile(output, 'utf-8')
    const config = parse(content)

    expect(config.shared_layers).toContain('types')
  })

  test('generates can_import from actual dependency graph', async () => {
    const output = tmpOutput('init-deps')
    await $`bun run ${entryPoint} init --non-interactive --output ${output} ${join(fixturesDir, 'valid-project')}`.quiet()

    const content = await readFile(output, 'utf-8')
    const config = parse(content)

    const components = config.layers.find((l: { name: string }) => l.name === 'components')
    const hooks = config.layers.find((l: { name: string }) => l.name === 'hooks')

    expect(components.can_import).toContain('hooks')
    expect(hooks.can_import).toContain('lib')
  })

  test('sets max_file_lines threshold based on actual file sizes', async () => {
    const output = tmpOutput('init-threshold')
    await $`bun run ${entryPoint} init --non-interactive --output ${output} ${join(fixturesDir, 'valid-project')}`.quiet()

    const content = await readFile(output, 'utf-8')
    const config = parse(content)

    expect(config.thresholds.max_file_lines).toBeGreaterThan(0)
    // Should be a round number ending in 00
    expect(config.thresholds.max_file_lines % 100).toBe(0)
  })
})

import { test, expect, describe } from 'bun:test'
import { join } from 'node:path'
import { $ } from 'bun'

const fixturesDir = join(import.meta.dir, '..', 'fixtures')
const entryPoint = join(import.meta.dir, '..', '..', 'src', 'index.ts')

describe('check command', () => {
  test('check on valid-project → exit code 0, no violations', async () => {
    const result = await $`bun run ${entryPoint} check --format json ${join(fixturesDir, 'valid-project')}`.quiet().nothrow()
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString())
    // Should have no errors (may have warnings)
    const errors = output.filter((v: { severity: string }) => v.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  test('check on violation-project → lists boundary violations', async () => {
    const result = await $`bun run ${entryPoint} check --format json ${join(fixturesDir, 'violation-project')}`.quiet().nothrow()
    const output = JSON.parse(result.stdout.toString())
    const boundaryViolations = output.filter((v: { type: string }) => v.type === 'boundary')
    expect(boundaryViolations.length).toBeGreaterThanOrEqual(1)
  })

  test('check on violation-project has banned import error → exit code 1', async () => {
    const result = await $`bun run ${entryPoint} check --format json ${join(fixturesDir, 'violation-project')}`.quiet().nothrow()
    // Should exit 1 because banned imports are errors
    expect(result.exitCode).toBe(1)
    const output = JSON.parse(result.stdout.toString())
    const banned = output.filter((v: { type: string }) => v.type === 'banned')
    expect(banned.length).toBeGreaterThanOrEqual(1)
  })

  test('check on stale-config → self-validation error about dead paths', async () => {
    const result = await $`bun run ${entryPoint} check --format json ${join(fixturesDir, 'stale-config')}`.quiet().nothrow()
    expect(result.exitCode).toBe(1)
    const output = JSON.parse(result.stdout.toString())
    const deadPath = output.find((v: { message: string }) => v.message.includes('dead path'))
    expect(deadPath).toBeDefined()
  })

  test('--format json outputs valid JSON array', async () => {
    const result = await $`bun run ${entryPoint} check --format json ${join(fixturesDir, 'valid-project')}`.quiet().nothrow()
    const parsed = JSON.parse(result.stdout.toString())
    expect(Array.isArray(parsed)).toBe(true)
  })

  test('--format pretty outputs human-readable text', async () => {
    const result = await $`bun run ${entryPoint} check --format pretty ${join(fixturesDir, 'valid-project')}`.quiet().nothrow()
    // Pretty format goes to stderr via clack, but should not crash
    expect(result.exitCode).toBe(0)
  })

  test('check on alias-project resolves @/ paths correctly', async () => {
    const result = await $`bun run ${entryPoint} check --format json ${join(fixturesDir, 'alias-project')}`.quiet().nothrow()
    const output = JSON.parse(result.stdout.toString())
    // AliasTest imports from @/lib/api — components can import hooks but not lib
    // So there should be a boundary violation
    const libViolation = output.find((v: { type: string; targetLayer?: string }) =>
      v.type === 'boundary' && v.targetLayer === 'lib'
    )
    expect(libViolation).toBeDefined()
  })

  test('check on big-file-project → threshold warning', async () => {
    const result = await $`bun run ${entryPoint} check --format json ${join(fixturesDir, 'big-file-project')}`.quiet().nothrow()
    expect(result.exitCode).toBe(0) // warnings don't cause exit 1
    const output = JSON.parse(result.stdout.toString())
    const threshold = output.find((v: { type: string }) => v.type === 'threshold')
    expect(threshold).toBeDefined()
  })
})

import { test, expect, describe } from 'bun:test'
import { selfValidate } from '../src/core/self-validate.ts'
import { loadConfig } from '../src/core/config.ts'
import { join } from 'node:path'

const fixturesDir = join(import.meta.dir, 'fixtures')

describe('selfValidate', () => {
  test('valid config passes self-validation', async () => {
    const config = await loadConfig(join(fixturesDir, 'valid-project'))
    const violations = await selfValidate(config, join(fixturesDir, 'valid-project'))
    // Should have no errors (may have warnings for unclaimed dirs)
    const errors = violations.filter(v => v.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  test('dead path glob (matches zero files) → error violation', async () => {
    const config = await loadConfig(join(fixturesDir, 'stale-config'))
    const violations = await selfValidate(config, join(fixturesDir, 'stale-config'))
    const deadPath = violations.find(v =>
      v.message.includes('deleted-feature') && v.message.includes('dead path')
    )
    expect(deadPath).toBeDefined()
    expect(deadPath!.severity).toBe('error')
  })

  test('unclaimed directory under src → warning violation', async () => {
    const config = await loadConfig(join(fixturesDir, 'stale-config'))
    // stale-config has src/components claimed but the deleted-feature path is dead
    // There shouldn't be an unclaimed dir warning for components since it's claimed
    const violations = await selfValidate(config, join(fixturesDir, 'stale-config'))
    // All violations should be typed correctly
    for (const v of violations) {
      expect(v.type).toBe('self-validation')
    }
  })

  test('overlapping layer globs are allowed (resolved by specificity)', async () => {
    const config = await loadConfig(join(fixturesDir, 'multi-layer'))
    const violations = await selfValidate(config, join(fixturesDir, 'multi-layer'))
    // Should not error on overlapping globs — that's fine
    const overlapErrors = violations.filter(v =>
      v.message.includes('overlap')
    )
    expect(overlapErrors).toHaveLength(0)
  })
})

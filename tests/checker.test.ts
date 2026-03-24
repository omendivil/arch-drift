import { test, expect, describe } from 'bun:test'
import { checkBoundaries, checkBanned, checkThresholds } from '../src/core/checker.ts'
import { loadConfig } from '../src/core/config.ts'
import { scanProject } from '../src/core/scanner.ts'
import { join } from 'node:path'

const fixturesDir = join(import.meta.dir, 'fixtures')

describe('checkBoundaries', () => {
  test('clean project returns zero violations', async () => {
    const config = await loadConfig(join(fixturesDir, 'valid-project'))
    const files = await scanProject(join(fixturesDir, 'valid-project'), config)
    const violations = checkBoundaries(files, config)
    expect(violations).toHaveLength(0)
  })

  test('component importing from lib when not allowed → boundary violation', async () => {
    const config = await loadConfig(join(fixturesDir, 'violation-project'))
    const files = await scanProject(join(fixturesDir, 'violation-project'), config)
    const violations = checkBoundaries(files, config)
    // Bad.tsx imports from lib directly
    const libViolation = violations.find(v =>
      v.file.includes('Bad.tsx') && v.targetLayer === 'lib'
    )
    expect(libViolation).toBeDefined()
    expect(libViolation!.type).toBe('boundary')
    expect(libViolation!.sourceLayer).toBe('components')
  })

  test('import from shared_layer is always allowed', async () => {
    const config = await loadConfig(join(fixturesDir, 'valid-project'))
    const files = await scanProject(join(fixturesDir, 'valid-project'), config)
    const violations = checkBoundaries(files, config)
    // types is shared — no violations for importing types
    const typesViolations = violations.filter(v => v.targetLayer === 'types')
    expect(typesViolations).toHaveLength(0)
  })

  test('external imports never trigger boundary violations', async () => {
    const config = await loadConfig(join(fixturesDir, 'violation-project'))
    const files = await scanProject(join(fixturesDir, 'violation-project'), config)
    const violations = checkBoundaries(files, config)
    // zustand is external — should not appear in boundary violations
    const zustandBoundary = violations.find(v =>
      v.type === 'boundary' && v.message.includes('zustand')
    )
    expect(zustandBoundary).toBeUndefined()
  })

  test('side-effect imports never trigger boundary violations', () => {
    const files = [{
      path: 'src/components/Styled.tsx',
      layer: 'components',
      imports: [{
        raw: "import './styles.css'",
        source: './styles.css',
        resolved: 'src/components/styles.css',
        line: 1,
        isSideEffect: true,
      }],
      lineCount: 5,
    }]
    const config = {
      version: 1,
      project: { name: 'test', src: 'src' },
      shared_layers: [],
      exclude: [],
      layers: [{ name: 'components', paths: ['src/components/**'], can_import: [] }],
      thresholds: {},
      banned: [],
      rules: {},
    }
    const violations = checkBoundaries(files, config)
    expect(violations).toHaveLength(0)
  })
})

describe('checkBanned', () => {
  test('banned pattern match → banned violation', async () => {
    const config = await loadConfig(join(fixturesDir, 'violation-project'))
    const files = await scanProject(join(fixturesDir, 'violation-project'), config)
    const violations = checkBanned(files, config)
    const zustandBan = violations.find(v => v.message.includes('zustand'))
    expect(zustandBan).toBeDefined()
    expect(zustandBan!.type).toBe('banned')
    expect(zustandBan!.severity).toBe('error')
  })
})

describe('checkThresholds', () => {
  test('file exceeding max_file_lines → threshold violation', async () => {
    const config = await loadConfig(join(fixturesDir, 'big-file-project'))
    const files = await scanProject(join(fixturesDir, 'big-file-project'), config)
    const violations = checkThresholds(files, config)
    expect(violations.length).toBeGreaterThanOrEqual(1)
    expect(violations[0]!.type).toBe('threshold')
    expect(violations[0]!.rule).toBe('max_file_lines')
  })
})

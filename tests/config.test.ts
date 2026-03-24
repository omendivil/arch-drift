import { test, expect, describe } from 'bun:test'
import { loadConfig, validateSchema } from '../src/core/config.ts'
import { join } from 'node:path'

const fixturesDir = join(import.meta.dir, 'fixtures')

describe('config', () => {
  test('loads valid architecture.yml correctly', async () => {
    const config = await loadConfig(join(fixturesDir, 'valid-project'))
    expect(config.version).toBe(1)
    expect(config.project.name).toBe('valid-project')
    expect(config.project.src).toBe('src')
    expect(config.layers).toHaveLength(4)
    expect(config.shared_layers).toEqual(['types'])
  })

  test('throws on missing required fields (version)', () => {
    expect(() => validateSchema({ project: { name: 'x', src: 'src' }, layers: [] }))
      .toThrow('Missing required field: version')
  })

  test('throws on missing required fields (project)', () => {
    expect(() => validateSchema({ version: 1, layers: [] }))
      .toThrow('Missing required field: project')
  })

  test('throws on missing required fields (layers)', () => {
    expect(() => validateSchema({ version: 1, project: { name: 'x', src: 'src' } }))
      .toThrow('Missing required field: layers')
  })

  test('throws on invalid types (layers not an array)', () => {
    expect(() => validateSchema({ version: 1, project: { name: 'x', src: 'src' }, layers: 'bad' }))
      .toThrow('Field "layers" must be an array')
  })

  test('merges shared_layers into each layer can_import', async () => {
    const config = await loadConfig(join(fixturesDir, 'valid-project'))
    // components should have [hooks, types] since types is shared
    const components = config.layers.find(l => l.name === 'components')!
    expect(components.can_import).toContain('hooks')
    expect(components.can_import).toContain('types')
  })

  test('handles missing optional fields with defaults', async () => {
    const config = await loadConfig(join(fixturesDir, 'multi-layer'))
    expect(config.banned).toEqual([])
    expect(config.rules).toEqual({})
    expect(config.exclude).toEqual([])
  })
})

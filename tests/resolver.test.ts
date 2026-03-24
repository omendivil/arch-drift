import { test, expect, describe } from 'bun:test'
import { resolveFileLayer, resolveImportLayer, isExternalImport } from '../src/core/resolver.ts'
import type { Layer } from '../src/core/config.ts'

const testLayers: Layer[] = [
  { name: 'components', paths: ['src/components/**'], can_import: ['hooks', 'types'] },
  { name: 'shared', paths: ['src/components/shared/**'], can_import: [] },
  { name: 'hooks', paths: ['src/hooks/**'], can_import: ['lib', 'types'] },
  { name: 'lib', paths: ['src/lib/**'], can_import: ['types'] },
  { name: 'types', paths: ['src/types/**'], can_import: [] },
]

describe('resolveFileLayer', () => {
  test('resolves file to correct layer', () => {
    expect(resolveFileLayer('src/components/Button.tsx', testLayers)).toBe('components')
    expect(resolveFileLayer('src/hooks/useData.ts', testLayers)).toBe('hooks')
    expect(resolveFileLayer('src/lib/api.ts', testLayers)).toBe('lib')
    expect(resolveFileLayer('src/types/index.ts', testLayers)).toBe('types')
  })

  test('most-specific glob wins', () => {
    // src/components/shared/Icon.tsx should match 'shared' (more specific), not 'components'
    expect(resolveFileLayer('src/components/shared/Icon.tsx', testLayers)).toBe('shared')
  })

  test('returns null for files not in any layer', () => {
    expect(resolveFileLayer('src/unknown/file.ts', testLayers)).toBeNull()
    expect(resolveFileLayer('other/file.ts', testLayers)).toBeNull()
  })
})

describe('resolveImportLayer', () => {
  test('resolves import path to target layer', () => {
    expect(resolveImportLayer('src/lib/api', testLayers, '')).toBe('lib')
    expect(resolveImportLayer('src/types/index', testLayers, '')).toBe('types')
  })

  test('resolves with file extensions', () => {
    expect(resolveImportLayer('src/hooks/useData', testLayers, '')).toBe('hooks')
  })
})

describe('isExternalImport', () => {
  test('identifies external imports (packages)', () => {
    expect(isExternalImport('react')).toBe(true)
    expect(isExternalImport('zustand')).toBe(true)
    expect(isExternalImport('@clack/prompts')).toBe(true)
    expect(isExternalImport('node:fs')).toBe(true)
  })

  test('identifies internal imports', () => {
    expect(isExternalImport('./utils')).toBe(false)
    expect(isExternalImport('../lib/api')).toBe(false)
    expect(isExternalImport('/absolute/path')).toBe(false)
  })
})

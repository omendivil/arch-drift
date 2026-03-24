import { test, expect, describe } from 'bun:test'
import { parseImports, resolveAlias, loadTsconfigPaths, scanProject } from '../src/core/scanner.ts'
import { loadConfig } from '../src/core/config.ts'
import { join } from 'node:path'

const fixturesDir = join(import.meta.dir, 'fixtures')

describe('parseImports', () => {
  test('extracts named imports', () => {
    const result = parseImports(`import { fetchItems } from '../lib/api'`)
    expect(result).toHaveLength(1)
    expect(result[0]!.source).toBe('../lib/api')
    expect(result[0]!.isSideEffect).toBe(false)
  })

  test('extracts default imports', () => {
    const result = parseImports(`import React from 'react'`)
    expect(result).toHaveLength(1)
    expect(result[0]!.source).toBe('react')
  })

  test('extracts namespace imports', () => {
    const result = parseImports(`import * as utils from './utils'`)
    expect(result).toHaveLength(1)
    expect(result[0]!.source).toBe('./utils')
  })

  test('skips side-effect imports (flagged as skip)', () => {
    const result = parseImports(`import './styles.css'`)
    expect(result).toHaveLength(1)
    expect(result[0]!.isSideEffect).toBe(true)
  })

  test('handles multiline imports', () => {
    const code = `import {
  X,
  Y
} from './path'`
    const result = parseImports(code)
    expect(result).toHaveLength(1)
    expect(result[0]!.source).toBe('./path')
    expect(result[0]!.line).toBe(1)
  })

  test('handles single and double quotes', () => {
    const code = `import { A } from "./double"
import { B } from './single'`
    const result = parseImports(code)
    expect(result).toHaveLength(2)
    expect(result[0]!.source).toBe('./double')
    expect(result[1]!.source).toBe('./single')
  })

  test('counts line numbers correctly', () => {
    const code = `const x = 1
import { A } from './a'
const y = 2
import { B } from './b'`
    const result = parseImports(code)
    expect(result).toHaveLength(2)
    expect(result[0]!.line).toBe(2)
    expect(result[1]!.line).toBe(4)
  })

  test('extracts type imports', () => {
    const result = parseImports(`import type { Item } from '../types'`)
    expect(result).toHaveLength(1)
    expect(result[0]!.source).toBe('../types')
  })
})

describe('resolveAlias', () => {
  test('resolves @/ alias', () => {
    const aliases = { '@/': './src/' }
    expect(resolveAlias('@/lib/api', aliases)).toBe('src/lib/api')
  })

  test('leaves non-alias imports unchanged', () => {
    const aliases = { '@/': './src/' }
    expect(resolveAlias('../lib/api', aliases)).toBe('../lib/api')
  })
})

describe('loadTsconfigPaths', () => {
  test('loads paths from tsconfig.json', () => {
    const aliases = loadTsconfigPaths(join(fixturesDir, 'valid-project'))
    expect(aliases['@/']).toBe('./src/')
  })

  test('returns empty object when no tsconfig', () => {
    const aliases = loadTsconfigPaths('/nonexistent')
    expect(aliases).toEqual({})
  })
})

describe('scanProject', () => {
  test('finds all source files and respects exclude', async () => {
    const config = await loadConfig(join(fixturesDir, 'valid-project'))
    const files = await scanProject(join(fixturesDir, 'valid-project'), config)
    expect(files.length).toBeGreaterThanOrEqual(4)
    // All files should have a layer
    for (const f of files) {
      expect(f.layer).not.toBeNull()
    }
  })

  test('resolves path aliases in imports', async () => {
    const config = await loadConfig(join(fixturesDir, 'alias-project'))
    const files = await scanProject(join(fixturesDir, 'alias-project'), config)
    const aliasTest = files.find(f => f.path.includes('AliasTest'))
    expect(aliasTest).toBeDefined()
    // @/lib/api should resolve to src/lib/api
    const libImport = aliasTest!.imports.find(i => i.source.includes('@/lib/api'))
    expect(libImport).toBeDefined()
    expect(libImport!.resolved).toBe('src/lib/api')
  })
})

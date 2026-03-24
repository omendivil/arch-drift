import fg from 'fast-glob'
import { readFile } from 'node:fs/promises'
import { join, dirname, resolve, relative } from 'node:path'
import type { ArchDriftConfig } from './config.ts'
import { resolveFileLayer } from './resolver.ts'

export interface ScannedFile {
  path: string
  layer: string | null
  imports: ImportStatement[]
  lineCount: number
}

export interface ImportStatement {
  raw: string
  source: string
  resolved: string
  line: number
  isSideEffect: boolean
}

export function parseImports(fileContent: string): ImportStatement[] {
  const imports: ImportStatement[] = []
  const lines = fileContent.split('\n')

  // Single-line import regex
  const singleLineRegex = /^import\s+(?:(?:type\s+)?(?:\{[^}]*\}|[\w*]+(?:\s+as\s+\w+)?|\*\s+as\s+\w+)\s+from\s+)?['"]([^'"]+)['"]/

  // Track multiline imports
  let inMultiline = false
  let multilineStart = 0
  let multilineRaw = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim()

    if (inMultiline) {
      multilineRaw += '\n' + lines[i]
      if (line.includes('from ')) {
        const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/)
        if (fromMatch) {
          const source = fromMatch[1]!
          imports.push({
            raw: multilineRaw.trim(),
            source,
            resolved: source,
            line: multilineStart + 1,
            isSideEffect: false,
          })
        }
        inMultiline = false
        multilineRaw = ''
        continue
      }
      continue
    }

    // Skip non-import lines
    if (!line.startsWith('import ') && !line.startsWith('import{')) continue

    // Check for multiline import (has { but no closing } on same line before from)
    if (line.includes('{') && !line.includes('}') && !line.includes('from ')) {
      inMultiline = true
      multilineStart = i
      multilineRaw = lines[i]!
      continue
    }

    // Side-effect import: import 'path' or import "path"
    const sideEffectMatch = line.match(/^import\s+['"]([^'"]+)['"]/)
    if (sideEffectMatch && !line.includes('from')) {
      imports.push({
        raw: line,
        source: sideEffectMatch[1]!,
        resolved: sideEffectMatch[1]!,
        line: i + 1,
        isSideEffect: true,
      })
      continue
    }

    const match = line.match(singleLineRegex)
    if (match) {
      imports.push({
        raw: line,
        source: match[1]!,
        resolved: match[1]!,
        line: i + 1,
        isSideEffect: false,
      })
    }
  }

  return imports
}

export function loadTsconfigPaths(projectRoot: string): Record<string, string> {
  const aliases: Record<string, string> = {}
  try {
    const tsconfigPath = join(projectRoot, 'tsconfig.json')
    const content = require('fs').readFileSync(tsconfigPath, 'utf-8')
    // Strip comments from JSON (single-line // comments)
    const stripped = content.replace(/\/\/.*$/gm, '')
    const tsconfig = JSON.parse(stripped)
    const paths = tsconfig?.compilerOptions?.paths
    if (paths) {
      for (const [alias, targets] of Object.entries(paths)) {
        const target = (targets as string[])[0]
        if (target) {
          // Convert "@/*" → "@/" and "./src/*" → "./src/"
          const aliasPrefix = alias.replace(/\*$/, '')
          const targetPrefix = target.replace(/\*$/, '')
          aliases[aliasPrefix] = targetPrefix
        }
      }
    }
  } catch {
    // No tsconfig or no paths — that's fine
  }
  return aliases
}

export function resolveAlias(importPath: string, aliases: Record<string, string>): string {
  for (const [aliasPrefix, targetPrefix] of Object.entries(aliases)) {
    if (importPath.startsWith(aliasPrefix)) {
      const rest = importPath.slice(aliasPrefix.length)
      let resolved = targetPrefix + rest
      // Normalize: remove leading "./" if present
      if (resolved.startsWith('./')) {
        resolved = resolved.slice(2)
      }
      return resolved
    }
  }
  return importPath
}

export async function scanProject(
  projectRoot: string,
  config: ArchDriftConfig
): Promise<ScannedFile[]> {
  const srcRoot = join(projectRoot, config.project.src)
  const patterns = [`${config.project.src}/**/*.{ts,tsx,js,jsx}`]
  const ignore = [
    '**/node_modules/**',
    ...config.exclude,
  ]

  const files = await fg(patterns, {
    cwd: projectRoot,
    ignore,
    absolute: false,
  })

  const aliases = loadTsconfigPaths(projectRoot)
  const scannedFiles: ScannedFile[] = []

  for (const filePath of files) {
    const fullPath = join(projectRoot, filePath)
    const content = await readFile(fullPath, 'utf-8')
    const rawImports = parseImports(content)

    // Resolve aliases and relative paths
    const resolvedImports = rawImports.map(imp => {
      let resolved = resolveAlias(imp.source, aliases)

      // Resolve relative imports to project-relative path
      if (resolved.startsWith('.')) {
        const fileDir = dirname(filePath)
        resolved = relative(projectRoot, resolve(projectRoot, fileDir, resolved))
      }

      return { ...imp, resolved }
    })

    const layer = resolveFileLayer(filePath, config.layers)

    scannedFiles.push({
      path: filePath,
      layer,
      imports: resolvedImports,
      lineCount: content.split('\n').length,
    })
  }

  return scannedFiles
}

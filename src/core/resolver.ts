import type { Layer } from './config.ts'

export function resolveFileLayer(filePath: string, layers: Layer[]): string | null {
  let bestMatch: { name: string; specificity: number } | null = null

  for (const layer of layers) {
    for (const pattern of layer.paths) {
      // Use minimatch-style glob matching
      if (matchGlob(filePath, pattern)) {
        // Specificity = length of the pattern's prefix (before any wildcard)
        const specificity = getSpecificity(pattern)
        if (!bestMatch || specificity > bestMatch.specificity) {
          bestMatch = { name: layer.name, specificity }
        }
      }
    }
  }

  return bestMatch?.name ?? null
}

function matchGlob(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // Handle ** (any depth) and * (single level)
  let regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{DOUBLE_STAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{DOUBLE_STAR\}\}/g, '.*')

  const regex = new RegExp(`^${regexStr}$`)
  return regex.test(filePath)
}

function getSpecificity(pattern: string): number {
  // The fixed prefix before any wildcard determines specificity
  const wildcardIndex = pattern.search(/[*?{[]/)
  if (wildcardIndex === -1) return pattern.length
  return wildcardIndex
}

export function resolveImportLayer(
  importPath: string,
  layers: Layer[],
  projectRoot: string
): string | null {
  // Try matching with common file extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']

  for (const ext of extensions) {
    const fullPath = importPath + ext
    const layer = resolveFileLayer(fullPath, layers)
    if (layer) return layer
  }

  return null
}

export function isExternalImport(importSource: string): boolean {
  // External imports don't start with . or /
  // And aren't path aliases (those should be resolved before this check)
  if (importSource.startsWith('.') || importSource.startsWith('/')) {
    return false
  }
  return true
}

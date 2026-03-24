import type { ArchDriftConfig } from './config.ts'
import type { ScannedFile } from './scanner.ts'
import { resolveImportLayer, isExternalImport } from './resolver.ts'

export interface Violation {
  type: 'boundary' | 'banned' | 'threshold' | 'self-validation'
  severity: 'warn' | 'error'
  file: string
  line?: number
  message: string
  advisory: string
  sourceLayer?: string
  targetLayer?: string
  rule?: string
}

export function checkBoundaries(
  files: ScannedFile[],
  config: ArchDriftConfig
): Violation[] {
  const violations: Violation[] = []

  for (const file of files) {
    if (!file.layer) continue

    const sourceLayer = config.layers.find(l => l.name === file.layer)
    if (!sourceLayer) continue

    for (const imp of file.imports) {
      // Skip side-effect imports
      if (imp.isSideEffect) continue

      // Skip external imports — check resolved path, not source (aliases like @/ would look external)
      if (imp.resolved === imp.source && isExternalImport(imp.source)) continue

      // Resolve the import target to a layer
      const targetLayer = resolveImportLayer(imp.resolved, config.layers, '')
      if (!targetLayer) continue

      // Same layer is always OK
      if (targetLayer === file.layer) continue

      // Check if import is allowed
      if (!sourceLayer.can_import.includes(targetLayer)) {
        violations.push({
          type: 'boundary',
          severity: 'warn',
          file: file.path,
          line: imp.line,
          message: `Layer "${file.layer}" imports from "${targetLayer}" which is not in its can_import list`,
          advisory: `${file.path} imports from ${imp.source}\n\n  Current rule: "${file.layer}" can only import from [${sourceLayer.can_import.join(', ')}]\n  This import targets layer "${targetLayer}" which is not allowed.\n  → To allow: run \`arch-drift allow ${file.layer}:${targetLayer}\``,
          sourceLayer: file.layer,
          targetLayer,
        })
      }
    }
  }

  return violations
}

export function checkBanned(
  files: ScannedFile[],
  config: ArchDriftConfig
): Violation[] {
  const violations: Violation[] = []

  if (!config.banned || config.banned.length === 0) return violations

  for (const file of files) {
    for (const imp of file.imports) {
      for (const ban of config.banned) {
        const regex = new RegExp(ban.pattern)
        if (regex.test(imp.source)) {
          violations.push({
            type: 'banned',
            severity: 'error',
            file: file.path,
            line: imp.line,
            message: `Banned import "${imp.source}" matches pattern "${ban.pattern}"`,
            advisory: `${file.path} imports "${imp.source}"\n\n  This import is banned: ${ban.why}\n  Pattern: ${ban.pattern}`,
            rule: 'banned',
          })
        }
      }
    }
  }

  return violations
}

export function checkThresholds(
  files: ScannedFile[],
  config: ArchDriftConfig
): Violation[] {
  const violations: Violation[] = []

  if (!config.thresholds?.max_file_lines) return violations

  const maxLines = config.thresholds.max_file_lines

  for (const file of files) {
    if (file.lineCount > maxLines) {
      violations.push({
        type: 'threshold',
        severity: 'warn',
        file: file.path,
        message: `File has ${file.lineCount} lines, exceeding threshold of ${maxLines}`,
        advisory: `${file.path} has ${file.lineCount} lines (max: ${maxLines})\n\n  Consider splitting this file into smaller modules.`,
        rule: 'max_file_lines',
      })
    }
  }

  return violations
}

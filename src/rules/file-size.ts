import type { ScannedFile } from '../core/scanner.ts'
import type { ArchDriftConfig } from '../core/config.ts'
import type { Violation } from '../core/checker.ts'

export function fileSizeRule(file: ScannedFile, config: ArchDriftConfig): Violation[] {
  const severity = config.rules?.max_file_lines
  if (!severity || severity === 'off') return []

  const maxLines = config.thresholds?.max_file_lines
  if (!maxLines) return []

  if (file.lineCount > maxLines) {
    return [{
      type: 'threshold',
      severity,
      file: file.path,
      message: `File has ${file.lineCount} lines, exceeding threshold of ${maxLines}`,
      advisory: `${file.path} has ${file.lineCount} lines (max: ${maxLines})\n\n  Consider splitting this file into smaller modules.`,
      rule: 'max_file_lines',
    }]
  }

  return []
}

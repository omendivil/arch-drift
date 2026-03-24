import type { ScannedFile } from '../core/scanner.ts'
import type { ArchDriftConfig } from '../core/config.ts'
import type { Violation } from '../core/checker.ts'

export function noAnyRule(file: ScannedFile, config: ArchDriftConfig): Violation[] {
  const severity = config.rules?.no_any
  if (!severity || severity === 'off') return []

  const violations: Violation[] = []
  const content = require('fs').readFileSync(
    require('path').join(process.cwd(), file.path),
    'utf-8'
  ) as string
  const lines = content.split('\n')

  const patterns = [/:\s*any\b/, /\bas\s+any\b/, /<any>/]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue

    for (const pattern of patterns) {
      if (pattern.test(line)) {
        violations.push({
          type: 'threshold',
          severity,
          file: file.path,
          line: i + 1,
          message: `Usage of "any" type detected`,
          advisory: `${file.path}:${i + 1} uses "any" type.\n\n  Consider using a more specific type.`,
          rule: 'no_any',
        })
        break
      }
    }
  }

  return violations
}

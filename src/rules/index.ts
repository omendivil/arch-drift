import type { ScannedFile } from '../core/scanner.ts'
import type { ArchDriftConfig } from '../core/config.ts'
import type { Violation } from '../core/checker.ts'
import { noAnyRule } from './no-any.ts'
import { fileSizeRule } from './file-size.ts'

export type RuleFn = (file: ScannedFile, config: ArchDriftConfig) => Violation[]

const ruleRegistry: Record<string, RuleFn> = {
  no_any: noAnyRule,
  max_file_lines: fileSizeRule,
}

export function runRules(files: ScannedFile[], config: ArchDriftConfig): Violation[] {
  const violations: Violation[] = []

  for (const file of files) {
    for (const [ruleName, ruleFn] of Object.entries(ruleRegistry)) {
      const ruleConfig = config.rules?.[ruleName]
      if (ruleConfig && ruleConfig !== 'off') {
        violations.push(...ruleFn(file, config))
      }
    }
  }

  return violations
}

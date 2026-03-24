import type { Violation } from '../core/checker.ts'

export function formatJson(violations: Violation[]): string {
  return JSON.stringify(violations, null, 2)
}

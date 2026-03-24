import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { Violation } from '../core/checker.ts'
import type { ArchDriftConfig } from '../core/config.ts'

export function printResults(violations: Violation[], config: ArchDriftConfig): void {
  if (violations.length === 0) {
    p.log.success(pc.green('No violations found!'))
    return
  }

  const errors = violations.filter(v => v.severity === 'error')
  const warnings = violations.filter(v => v.severity === 'warn')

  if (errors.length > 0) {
    p.log.error(pc.red(`${errors.length} error(s) found:`))
    for (const v of errors) {
      const location = v.line ? `${v.file}:${v.line}` : v.file
      p.log.error(`  ${pc.red('✖')} ${pc.dim(location)} ${v.message}`)
      if (v.advisory) {
        for (const line of v.advisory.split('\n')) {
          p.log.message(`    ${pc.dim(line)}`)
        }
      }
    }
  }

  if (warnings.length > 0) {
    p.log.warn(pc.yellow(`${warnings.length} warning(s) found:`))
    for (const v of warnings) {
      const location = v.line ? `${v.file}:${v.line}` : v.file
      p.log.warn(`  ${pc.yellow('▲')} ${pc.dim(location)} ${v.message}`)
      if (v.advisory) {
        for (const line of v.advisory.split('\n')) {
          p.log.message(`    ${pc.dim(line)}`)
        }
      }
    }
  }
}

export function printSummary(violations: Violation[]): void {
  const errors = violations.filter(v => v.severity === 'error').length
  const warnings = violations.filter(v => v.severity === 'warn').length

  if (errors === 0 && warnings === 0) {
    p.outro(pc.green('All checks passed!'))
  } else {
    const parts: string[] = []
    if (errors > 0) parts.push(pc.red(`${errors} error(s)`))
    if (warnings > 0) parts.push(pc.yellow(`${warnings} warning(s)`))
    p.outro(parts.join(', '))
  }
}

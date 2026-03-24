import type { Violation } from '../core/checker.ts'
import type { ArchDriftConfig } from '../core/config.ts'

export function buildAdvisory(violation: Violation, config: ArchDriftConfig): string {
  if (violation.advisory) return violation.advisory

  switch (violation.type) {
    case 'boundary':
      return `${violation.file} imports from layer "${violation.targetLayer}"\n\n  Current rule: "${violation.sourceLayer}" cannot import from "${violation.targetLayer}"\n  → To allow: run \`arch-drift allow ${violation.sourceLayer}:${violation.targetLayer}\``

    case 'banned':
      return `${violation.file} uses a banned import.\n\n  ${violation.message}`

    case 'threshold':
      return `${violation.file} exceeds a threshold.\n\n  ${violation.message}`

    case 'self-validation':
      return `Configuration issue detected.\n\n  ${violation.message}`

    default:
      return violation.message
  }
}

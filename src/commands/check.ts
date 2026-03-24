import { defineCommand } from 'citty'
import { resolve } from 'node:path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { loadConfig } from '../core/config.ts'
import { scanProject } from '../core/scanner.ts'
import { selfValidate } from '../core/self-validate.ts'
import { checkBoundaries, checkBanned, checkThresholds } from '../core/checker.ts'
import type { Violation } from '../core/checker.ts'
import { runRules } from '../rules/index.ts'
import { printResults, printSummary } from '../output/pretty.ts'
import { formatJson } from '../output/json.ts'

export default defineCommand({
  meta: { name: 'check', description: 'Check architecture boundaries' },
  args: {
    format: {
      type: 'string',
      description: 'Output format: pretty or json',
      default: 'pretty',
    },
    config: {
      type: 'string',
      description: 'Path to architecture.yml',
    },
    _dir: {
      type: 'positional',
      description: 'Project root directory',
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(args._dir || '.')
    const format = args.format as 'pretty' | 'json'

    if (format === 'pretty') {
      p.intro(pc.cyan('arch-drift check'))
    }

    // 1. Load config
    let config
    try {
      config = await loadConfig(projectRoot, args.config)
    } catch (err) {
      if (format === 'pretty') {
        p.log.error(pc.red(`Failed to load config: ${(err as Error).message}`))
        p.outro(pc.red('Check failed'))
      } else {
        console.error(JSON.stringify({ error: (err as Error).message }))
      }
      process.exit(1)
    }

    // 2. Self-validate
    const selfViolations = await selfValidate(config, projectRoot)
    const selfErrors = selfViolations.filter(v => v.severity === 'error')

    if (selfErrors.length > 0) {
      if (format === 'pretty') {
        printResults(selfErrors, config)
        p.outro(pc.red('Config validation failed'))
      } else {
        console.log(formatJson(selfErrors))
      }
      process.exit(1)
    }

    // 3. Scan project
    const files = await scanProject(projectRoot, config)

    // 4. Run all checks
    const allViolations: Violation[] = [
      ...selfViolations,
      ...checkBoundaries(files, config),
      ...checkBanned(files, config),
      ...checkThresholds(files, config),
      ...runRules(files, config),
    ]

    // 5. Output
    if (format === 'json') {
      console.log(formatJson(allViolations))
    } else {
      printResults(allViolations, config)
      printSummary(allViolations)
    }

    // 6. Exit code
    const hasErrors = allViolations.some(v => v.severity === 'error')
    if (hasErrors) {
      process.exit(1)
    }
  },
})

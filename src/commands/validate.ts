import { defineCommand } from 'citty'
import { resolve } from 'node:path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { loadConfig } from '../core/config.ts'
import { selfValidate } from '../core/self-validate.ts'
import { printResults, printSummary } from '../output/pretty.ts'
import { formatJson } from '../output/json.ts'

export default defineCommand({
  meta: { name: 'validate', description: 'Validate architecture.yml config' },
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
      p.intro(pc.cyan('arch-drift validate'))
    }

    let config
    try {
      config = await loadConfig(projectRoot, args.config)
    } catch (err) {
      if (format === 'pretty') {
        p.log.error(pc.red(`Failed to load config: ${(err as Error).message}`))
        p.outro(pc.red('Validation failed'))
      } else {
        console.error(JSON.stringify({ error: (err as Error).message }))
      }
      process.exit(1)
    }

    const violations = await selfValidate(config, projectRoot)

    if (format === 'json') {
      console.log(formatJson(violations))
    } else {
      printResults(violations, config)
      printSummary(violations)
    }

    const hasErrors = violations.some(v => v.severity === 'error')
    if (hasErrors) {
      process.exit(1)
    }
  },
})

import { defineCommand } from 'citty'
import { resolve, join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { parse, stringify } from 'yaml'
import * as p from '@clack/prompts'
import pc from 'picocolors'

export default defineCommand({
  meta: { name: 'allow', description: 'Allow an import relationship between layers' },
  args: {
    _pair: {
      type: 'positional',
      description: 'Layer pair in format source:target (e.g., components:lib)',
      required: true,
    },
    config: {
      type: 'string',
      description: 'Path to architecture.yml',
    },
  },
  async run({ args }) {
    const pair = args._pair
    if (!pair || !pair.includes(':')) {
      p.log.error(pc.red('Usage: arch-drift allow <source>:<target>'))
      process.exit(1)
    }

    const [sourceLayer, targetLayer] = pair.split(':')
    if (!sourceLayer || !targetLayer) {
      p.log.error(pc.red('Usage: arch-drift allow <source>:<target>'))
      process.exit(1)
    }

    const configPath = args.config || join(resolve('.'), 'architecture.yml')

    let content: string
    try {
      content = await readFile(configPath, 'utf-8')
    } catch {
      p.log.error(pc.red(`Could not read config: ${configPath}`))
      process.exit(1)
    }

    const config = parse(content)

    // Find source layer
    const layer = config.layers?.find((l: { name: string }) => l.name === sourceLayer)
    if (!layer) {
      p.log.error(pc.red(`Layer "${sourceLayer}" not found in config`))
      process.exit(1)
    }

    // Check target layer exists
    const targetExists = config.layers?.some((l: { name: string }) => l.name === targetLayer)
    if (!targetExists) {
      p.log.error(pc.red(`Layer "${targetLayer}" not found in config`))
      process.exit(1)
    }

    // Add to can_import if not already present
    if (!layer.can_import) {
      layer.can_import = []
    }

    if (layer.can_import.includes(targetLayer)) {
      p.log.info(pc.yellow(`Layer "${sourceLayer}" can already import from "${targetLayer}"`))
      return
    }

    layer.can_import.push(targetLayer)

    await writeFile(configPath, stringify(config), 'utf-8')
    p.log.success(pc.green(`Updated: "${sourceLayer}" can now import from "${targetLayer}"`))
  },
})

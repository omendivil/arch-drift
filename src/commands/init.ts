import { defineCommand } from 'citty'
import { stringify } from 'yaml'
import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { readdir } from 'node:fs/promises'
import fg from 'fast-glob'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { detectStack } from '../detect/stack.ts'
import { parseImports, loadTsconfigPaths, resolveAlias } from '../core/scanner.ts'
import { readFile } from 'node:fs/promises'

export default defineCommand({
  meta: { name: 'init', description: 'Initialize architecture.yml from project analysis' },
  args: {
    'non-interactive': {
      type: 'boolean',
      description: 'Skip prompts, auto-assign all',
      default: false,
    },
    output: {
      type: 'string',
      description: 'Output path for architecture.yml',
    },
    _dir: {
      type: 'positional',
      description: 'Project root directory',
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(args._dir || '.')
    const outputPath = args.output || join(projectRoot, 'architecture.yml')
    const nonInteractive = args['non-interactive']

    if (!nonInteractive) {
      p.intro(pc.cyan('arch-drift init'))
    }

    // 1. Detect stack
    const stack = detectStack(projectRoot)

    // 2. Determine source root
    const srcRoot = determineSrcRoot(projectRoot)

    // 3. Find all directories under src root
    const srcPath = join(projectRoot, srcRoot)
    let dirs: string[]
    try {
      const entries = await readdir(srcPath, { withFileTypes: true })
      dirs = entries.filter(e => e.isDirectory()).map(e => e.name)
    } catch {
      dirs = []
    }

    // Filter out common non-layer directories
    const ignoreDirs = new Set(['node_modules', '.git', '.next', '__pycache__', 'dist', 'build', '.turbo'])
    dirs = dirs.filter(d => !ignoreDirs.has(d))

    // 4. Build layers from directories
    const layers: Array<{
      name: string
      paths: string[]
      can_import: string[]
    }> = dirs.map(dir => ({
      name: dir,
      paths: [`${srcRoot}/${dir}/**`],
      can_import: [],
    }))

    // 5. Scan all files for imports
    const aliases = loadTsconfigPaths(projectRoot)
    const filePattern = `${srcRoot}/**/*.{ts,tsx,js,jsx}`
    const files = await fg(filePattern, {
      cwd: projectRoot,
      ignore: ['**/node_modules/**'],
      absolute: false,
    })

    // Build dependency graph between layers
    const depGraph: Record<string, Set<string>> = {}
    for (const layer of layers) {
      depGraph[layer.name] = new Set()
    }

    let maxFileLines = 0

    for (const filePath of files) {
      const fullPath = join(projectRoot, filePath)
      const content = await readFile(fullPath, 'utf-8')

      const lineCount = content.split('\n').length
      if (lineCount > maxFileLines) maxFileLines = lineCount

      const imports = parseImports(content)
      const fileLayer = findLayerForFile(filePath, layers, srcRoot)
      if (!fileLayer) continue

      for (const imp of imports) {
        if (imp.isSideEffect) continue
        // Skip external imports
        if (!imp.source.startsWith('.') && !imp.source.startsWith('@/') && !imp.source.startsWith('~/')) {
          // Check if it's an alias
          const resolved = resolveAlias(imp.source, aliases)
          if (resolved === imp.source) continue // truly external
        }

        let resolved = resolveAlias(imp.source, aliases)
        if (resolved.startsWith('.')) {
          const { dirname, resolve: pathResolve, relative } = require('path')
          const fileDir = dirname(filePath)
          resolved = relative(projectRoot, pathResolve(projectRoot, fileDir, resolved))
        }
        // Remove leading ./
        if (resolved.startsWith('./')) resolved = resolved.slice(2)

        const targetLayer = findLayerForPath(resolved, layers, srcRoot)
        if (targetLayer && targetLayer !== fileLayer) {
          depGraph[fileLayer]?.add(targetLayer)
        }
      }
    }

    // 6. Generate can_import from actual dependency graph
    for (const layer of layers) {
      const deps = depGraph[layer.name]
      if (deps) {
        layer.can_import = Array.from(deps).sort()
      }
    }

    // 7. Detect shared_layers: layers imported by >75% of other layers
    const shared_layers: string[] = []
    const layerNames = layers.map(l => l.name)
    for (const layer of layers) {
      let importedByCount = 0
      for (const other of layers) {
        if (other.name === layer.name) continue
        if (depGraph[other.name]?.has(layer.name)) {
          importedByCount++
        }
      }
      const otherCount = layers.length - 1
      if (otherCount > 0 && importedByCount / otherCount > 0.75) {
        shared_layers.push(layer.name)
      }
    }

    // Remove shared layers from can_import lists (since they're implicit)
    for (const layer of layers) {
      layer.can_import = layer.can_import.filter(l => !shared_layers.includes(l))
    }

    // 8. Calculate max_file_lines threshold
    const maxFileThreshold = Math.ceil(maxFileLines / 100) * 100 + 100

    // 9. Build config
    const projectName = projectRoot.split('/').pop() || 'unknown'
    const config = {
      version: 1,
      project: {
        name: projectName,
        src: srcRoot,
      },
      shared_layers,
      exclude: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**'],
      layers: layers.map(l => ({
        name: l.name,
        paths: l.paths,
        can_import: l.can_import,
      })),
      thresholds: {
        max_file_lines: maxFileThreshold,
      },
      banned: [] as Array<{ pattern: string; why: string }>,
      rules: {} as Record<string, string>,
    }

    // 10. Write architecture.yml
    const yamlContent = stringify(config)
    await writeFile(outputPath, yamlContent, 'utf-8')

    // 11. Print summary
    if (!nonInteractive) {
      p.log.success(`Detected stack: ${pc.cyan(stack.language)}${stack.framework ? ` (${pc.cyan(stack.framework)})` : ''}`)
      p.log.info(`Found ${pc.bold(String(layers.length))} layers: ${layers.map(l => pc.cyan(l.name)).join(', ')}`)
      if (shared_layers.length > 0) {
        p.log.info(`Shared layers: ${shared_layers.map(l => pc.cyan(l)).join(', ')}`)
      }
      p.log.info(`Max file threshold: ${pc.yellow(String(maxFileThreshold))} lines`)
      p.log.success(`Written to ${pc.dim(outputPath)}`)
      p.outro(pc.green('Done!'))
    }
  },
})

function determineSrcRoot(projectRoot: string): string {
  const { existsSync } = require('fs')
  // Common source roots
  const candidates = ['src', 'app', 'lib', 'source']
  for (const c of candidates) {
    if (existsSync(join(projectRoot, c))) return c
  }
  return 'src'
}

function findLayerForFile(
  filePath: string,
  layers: Array<{ name: string; paths: string[] }>,
  srcRoot: string
): string | null {
  for (const layer of layers) {
    const layerDir = `${srcRoot}/${layer.name}/`
    if (filePath.startsWith(layerDir)) return layer.name
  }
  return null
}

function findLayerForPath(
  resolvedPath: string,
  layers: Array<{ name: string; paths: string[] }>,
  srcRoot: string
): string | null {
  for (const layer of layers) {
    const layerDir = `${srcRoot}/${layer.name}/`
    if (resolvedPath.startsWith(layerDir) || resolvedPath === `${srcRoot}/${layer.name}`) {
      return layer.name
    }
  }
  return null
}

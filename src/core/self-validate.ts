import fg from 'fast-glob'
import { join } from 'node:path'
import { readdir } from 'node:fs/promises'
import type { ArchDriftConfig } from './config.ts'
import type { Violation } from './checker.ts'

export async function selfValidate(
  config: ArchDriftConfig,
  projectRoot: string
): Promise<Violation[]> {
  const violations: Violation[] = []

  // Check that all layer path globs match at least 1 file
  for (const layer of config.layers) {
    for (const pattern of layer.paths) {
      const matches = await fg(pattern, {
        cwd: projectRoot,
        ignore: ['**/node_modules/**'],
      })

      if (matches.length === 0) {
        violations.push({
          type: 'self-validation',
          severity: 'error',
          file: 'architecture.yml',
          message: `Layer "${layer.name}" path "${pattern}" matches no files (dead path)`,
          advisory: `The glob pattern "${pattern}" in layer "${layer.name}" does not match any files.\n\n  Either the directory was deleted or the pattern is wrong.\n  Remove it from architecture.yml or fix the path.`,
        })
      }
    }
  }

  // Check that all directories under project.src are claimed by a layer
  const srcRoot = join(projectRoot, config.project.src)
  try {
    const entries = await readdir(srcRoot, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)

    for (const dir of dirs) {
      const dirPath = `${config.project.src}/${dir}`
      let claimed = false

      for (const layer of config.layers) {
        for (const pattern of layer.paths) {
          // Check if this layer's pattern would match files in this directory
          const testPath = `${dirPath}/test.ts`
          const regexStr = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '{{DOUBLE_STAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/\{\{DOUBLE_STAR\}\}/g, '.*')
          const regex = new RegExp(`^${regexStr}$`)

          if (regex.test(testPath)) {
            claimed = true
            break
          }
        }
        if (claimed) break
      }

      if (!claimed) {
        violations.push({
          type: 'self-validation',
          severity: 'warn',
          file: 'architecture.yml',
          message: `Directory "${dirPath}" is not claimed by any layer`,
          advisory: `The directory "${dirPath}" exists under the source root but no layer's paths match it.\n\n  Add a layer for this directory or add it to an existing layer's paths.`,
        })
      }
    }
  } catch {
    // src directory doesn't exist — that's a bigger problem but not self-validation's job
  }

  return violations
}

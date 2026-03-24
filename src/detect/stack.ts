import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface StackInfo {
  runtime: string
  framework: string | null
  language: string
}

export function detectStack(projectRoot: string): StackInfo {
  const exists = (file: string) => existsSync(join(projectRoot, file))

  let runtime = 'unknown'
  let framework: string | null = null
  let language = 'unknown'

  // Language detection
  if (exists('tsconfig.json')) {
    language = 'typescript'
  } else if (exists('package.json')) {
    language = 'javascript'
  } else if (exists('pyproject.toml') || exists('setup.py')) {
    language = 'python'
  } else if (exists('go.mod')) {
    language = 'go'
  }

  // Runtime detection
  if (exists('package.json')) {
    runtime = 'node'
  } else if (exists('pyproject.toml') || exists('setup.py')) {
    runtime = 'python'
  } else if (exists('go.mod')) {
    runtime = 'go'
  }

  // Framework detection
  if (exists('next.config.js') || exists('next.config.mjs') || exists('next.config.ts')) {
    framework = 'nextjs'
  } else if (exists('nuxt.config.ts') || exists('nuxt.config.js')) {
    framework = 'nuxt'
  } else if (exists('vite.config.ts') || exists('vite.config.js')) {
    framework = 'vite'
  }

  return { runtime, framework, language }
}

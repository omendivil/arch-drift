import { parse } from 'yaml'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface ArchDriftConfig {
  version: number
  project: { name: string; src: string }
  shared_layers: string[]
  exclude: string[]
  layers: Layer[]
  thresholds: { max_file_lines?: number }
  banned: BannedPattern[]
  rules: Record<string, 'warn' | 'error' | 'off'>
}

export interface Layer {
  name: string
  paths: string[]
  can_import: string[]
  why?: string
}

export interface BannedPattern {
  pattern: string
  why: string
}

interface RawConfig {
  version: unknown
  project: unknown
  shared_layers?: unknown
  exclude?: unknown
  layers: unknown
  thresholds?: unknown
  banned?: unknown
  rules?: unknown
}

export function validateSchema(raw: unknown): asserts raw is RawConfig {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Config must be a YAML object')
  }

  const obj = raw as Record<string, unknown>

  if (obj.version === undefined) {
    throw new Error('Missing required field: version')
  }
  if (typeof obj.version !== 'number') {
    throw new Error('Field "version" must be a number')
  }

  if (obj.project === undefined) {
    throw new Error('Missing required field: project')
  }
  if (typeof obj.project !== 'object' || obj.project === null) {
    throw new Error('Field "project" must be an object')
  }
  const project = obj.project as Record<string, unknown>
  if (typeof project.name !== 'string') {
    throw new Error('Field "project.name" must be a string')
  }
  if (typeof project.src !== 'string') {
    throw new Error('Field "project.src" must be a string')
  }

  if (obj.layers === undefined) {
    throw new Error('Missing required field: layers')
  }
  if (!Array.isArray(obj.layers)) {
    throw new Error('Field "layers" must be an array')
  }

  for (const layer of obj.layers) {
    if (typeof layer !== 'object' || layer === null) {
      throw new Error('Each layer must be an object')
    }
    if (typeof layer.name !== 'string') {
      throw new Error('Each layer must have a "name" string')
    }
    if (!Array.isArray(layer.paths)) {
      throw new Error(`Layer "${layer.name}" must have a "paths" array`)
    }
  }

  if (obj.shared_layers !== undefined && !Array.isArray(obj.shared_layers)) {
    throw new Error('Field "shared_layers" must be an array')
  }

  if (obj.exclude !== undefined && !Array.isArray(obj.exclude)) {
    throw new Error('Field "exclude" must be an array')
  }

  if (obj.banned !== undefined && !Array.isArray(obj.banned)) {
    throw new Error('Field "banned" must be an array')
  }
}

export async function loadConfig(projectRoot: string, configPath?: string): Promise<ArchDriftConfig> {
  const filePath = configPath || join(projectRoot, 'architecture.yml')
  let content: string

  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    throw new Error(`Could not read config file: ${filePath}`)
  }

  const raw = parse(content)
  validateSchema(raw)

  const sharedLayers: string[] = (raw.shared_layers as string[] | undefined) ?? []

  const layers: Layer[] = (raw.layers as Array<Record<string, unknown>>).map(l => ({
    name: l.name as string,
    paths: l.paths as string[],
    can_import: [
      ...(Array.isArray(l.can_import) ? l.can_import as string[] : []),
      ...sharedLayers,
    ],
    why: l.why as string | undefined,
  }))

  return {
    version: raw.version as number,
    project: raw.project as { name: string; src: string },
    shared_layers: sharedLayers,
    exclude: (raw.exclude as string[]) ?? [],
    layers,
    thresholds: (raw.thresholds as { max_file_lines?: number }) ?? {},
    banned: (raw.banned as BannedPattern[]) ?? [],
    rules: (raw.rules as Record<string, 'warn' | 'error' | 'off'>) ?? {},
  }
}

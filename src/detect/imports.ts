export function getImportPattern(language: string): RegExp {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return /import\s+(?:(?:type\s+)?(?:\{[^}]*\}|[\w*]+(?:\s+as\s+\w+)?|\*\s+as\s+\w+)\s+from\s+)?['"]([^'"]+)['"]/g

    case 'python':
      return /(?:^from\s+(\S+)\s+import|^import\s+(\S+))/gm

    default:
      return /import\s+['"]([^'"]+)['"]/g
  }
}

export function extractImports(
  content: string,
  language: string
): { source: string; line: number }[] {
  const results: { source: string; line: number }[] = []
  const lines = content.split('\n')
  const pattern = getImportPattern(language)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    pattern.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = pattern.exec(line)) !== null) {
      const source = match[1] || match[2]
      if (source) {
        results.push({ source, line: i + 1 })
      }
    }
  }

  return results
}

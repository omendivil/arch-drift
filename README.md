# arch-drift

![CI](https://github.com/omendivil/arch-drift/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/arch-drift)

Prevent architecture drift in your codebase. Define layer boundaries, detect violations, enforce on every commit.

## What it does

arch-drift reads an `architecture.yml` config that describes your project's layer boundaries (which modules can import from which), then checks your codebase for violations. It auto-detects your current architecture via `init`, then enforces it via `check` on every commit or PR.

### Design principles

- **Describes reality, doesn't prescribe ideals.** `init` captures what the codebase IS, not what you wish it was.
- **Advisor, not cop.** Violations explain the current pattern, what changed, and implications.
- **Everything starts as warnings.** Promote to errors deliberately when you're ready.
- **Self-validating.** Checks its own config for dead paths and missing coverage.
- **Zero token cost.** Runs as a CLI outside your AI context window.

## Install

```bash
# With bun (recommended)
bun add -d arch-drift

# With npm
npm install --save-dev arch-drift
```

## Quick start

```bash
# 1. Auto-detect your architecture
arch-drift init

# 2. Review the generated config
cat architecture.yml

# 3. Check for violations
arch-drift check
```

## Commands

### `arch-drift init`

Scans your project, detects the tech stack, analyzes import patterns between directories, and generates `architecture.yml`. Run this once to capture your baseline.

```bash
arch-drift init
arch-drift init --non-interactive  # Skip prompts, use defaults
```

### `arch-drift check`

Runs all architecture checks: boundary violations, banned imports, file size thresholds, and custom rules.

```bash
arch-drift check                # Pretty output for humans
arch-drift check --format json  # JSON output for CI
```

Exit codes:
- `0` — No errors (warnings are OK)
- `1` — Errors found

### `arch-drift validate`

Validates your `architecture.yml` config without scanning the project. Finds dead paths, unclaimed directories, and config errors.

```bash
arch-drift validate
```

### `arch-drift allow`

Whitelist a specific import relationship between layers.

```bash
arch-drift allow components:lib
```

## Configuration

`architecture.yml` in your project root:

```yaml
version: 1
project:
  name: my-app
  src: src

shared_layers:
  - types
  - utils

layers:
  - name: components
    paths:
      - 'src/components/**'
    can_import:
      - hooks
      - lib
    why: 'UI components layer'

  - name: hooks
    paths:
      - 'src/hooks/**'
    can_import:
      - lib
    why: 'React hooks and state management'

  - name: lib
    paths:
      - 'src/lib/**'
    can_import: []
    why: 'Core utilities and helpers'

thresholds:
  max_file_lines: 500

banned:
  - pattern: 'lodash'
    why: 'Use native JS instead'

rules:
  no_any: 'warn'
  max_file_lines: 'warn'
```

### Layers

Each layer defines:
- **`paths`** — Glob patterns for files in this layer
- **`can_import`** — Which other layers this one is allowed to import from
- **`why`** — Description shown in violation messages

Imports from `shared_layers` are always allowed (don't need to be listed in `can_import`).

### Violations

arch-drift reports four types of violations:

| Type | What it catches |
|------|----------------|
| **boundary** | Layer A imports from Layer B, but B isn't in A's `can_import` list |
| **banned** | Import matches a banned regex pattern |
| **threshold** | File exceeds `max_file_lines` |
| **self-validation** | Config errors: dead paths, unclaimed directories |

### Rules

Custom rules that can be set to `warn`, `error`, or `off`:

- **`no_any`** — Flags TypeScript `any` type usage
- **`max_file_lines`** — Flags files exceeding the threshold

## CI Integration

### GitHub Actions

```yaml
- name: Architecture check
  run: npx arch-drift check --format json
```

### Pre-commit hook

```bash
#!/bin/sh
npx arch-drift check
if [ $? -ne 0 ]; then
  echo "Architecture violations found. Fix them or run: arch-drift allow <source>:<target>"
  exit 1
fi
```

## Why this exists

AI coding agents (Claude Code, Cursor, Copilot) write code fast but don't know your architecture boundaries. arch-drift catches violations at commit time, whether the code was written by a human or an AI.

Traditional linters check syntax. arch-drift checks structure: "should this file be importing from that module?"

## License

MIT

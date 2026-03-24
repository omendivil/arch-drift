# Arch-Drift — Architecture Enforcement CLI

## Tech Stack
- Runtime: Bun
- Language: TypeScript (strict mode)
- CLI UI: @clack/prompts + picocolors
- Command routing: citty
- File discovery: fast-glob
- YAML: yaml package
- Testing: bun test

## Architecture
- `src/core/` — engine (config loading, scanning, resolving, checking, self-validation)
- `src/commands/` — CLI commands (init, check, validate, allow)
- `src/rules/` — pluggable rule functions
- `src/output/` — formatters (pretty terminal, JSON)
- `src/detect/` — stack and import detection
- `tests/fixtures/` — test project fixtures with known states

## Patterns
- All core logic is pure functions that take config + data and return results
- Commands orchestrate core functions and handle I/O
- Output formatting is separate from logic
- Rules are registered functions with a standard signature
- Config is loaded once and passed through

## Rules
- Use named exports, not default exports
- Async/await over raw promises
- No external dependencies beyond what's listed in package.json
- Tests use bun test with fixtures
- Do not modify test fixtures during tests — treat them as read-only
- Path aliases must be resolved via tsconfig.json, not hardcoded

## Testing
- `bun test` runs all tests
- Fixtures in tests/fixtures/ represent known project states
- Unit tests: one file per core module
- Integration tests: one file per command
- Always clean up any temp files created during tests

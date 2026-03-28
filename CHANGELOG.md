# Changelog

All notable changes to arch-drift will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-03-28

### Added
- `arch-drift init` — auto-detects project architecture from import graph, generates `architecture.yml`
- `arch-drift check` — validates config, checks import boundaries, banned patterns, file size thresholds
- `arch-drift validate` — validates `architecture.yml` config without scanning source files
- `arch-drift allow <source>:<target>` — updates config to allow a new import relationship
- Self-validating config: detects dead paths and unclaimed directories before checking code
- Advisory output format: violations explain current pattern, what changed, and how to resolve
- `--non-interactive` flag for `init` (CI and agent use)
- `--format json` flag for `check` (CI and machine-readable output)
- TypeScript path alias resolution (reads `tsconfig.json` `compilerOptions.paths`)
- Built-in rules: `no_any`, `max_file_lines`
- MIT license

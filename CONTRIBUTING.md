# Contributing to arch-drift

## Setup

```bash
git clone https://github.com/omendivil/arch-drift.git
cd arch-drift
bun install
bun test
```

## Making changes

1. Fork the repo and create a branch: `feature/your-feature` or `fix/your-fix`
2. Write tests for your change
3. Make sure `bun test` passes
4. Run `npx changeset` to describe your change — this is required for PRs that affect behavior
5. Open a PR

## Changesets

arch-drift uses [changesets](https://github.com/changesets/changesets) for versioning. When your PR changes behavior (new feature, bug fix, breaking change), run:

```bash
npx changeset
```

Choose the bump type:
- **patch** — bug fix, no behavior change for existing users
- **minor** — new feature, backwards compatible
- **major** — breaking change

Write a short description of what changed. Commit the generated file with your PR.

## Code style

- TypeScript throughout
- No unnecessary abstractions — if it only runs once, don't wrap it
- Tests live in `tests/` and use Bun's built-in test runner

## Release process

Releases are automated. When a PR with a changeset merges to main, the release workflow opens a "Version Packages" PR. When that's merged, it publishes to npm automatically.

# Changesets

This directory is managed by [changesets](https://github.com/changesets/changesets).

## How to release a new version

1. Make your changes in a feature branch
2. Run `npx changeset` and describe what changed (patch/minor/major)
3. Commit the generated changeset file along with your changes
4. Open a PR — CI will validate it
5. When merged to main, the release workflow opens a "Version Packages" PR automatically
6. Merge that PR — it bumps the version, updates CHANGELOG.md, and publishes to npm

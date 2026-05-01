# Contributing

## Requirements

- Node.js 22 or newer for local development.
- pnpm 10 or newer.

## Local checks

```sh
pnpm install
pnpm run verify
```

Use focused commands while developing:

```sh
pnpm run test
pnpm run build
pnpm run typecheck
pnpm run format
```

## Commits

This repository uses Conventional Commits. Examples:

```text
feat: add srcset parser
fix: keep descriptor whitespace valid
chore(release): merge main back into develop
```

Husky runs `commitlint` for commit messages.

## Branch flow

The repository follows a GitFlow-like process without requiring the GitFlow CLI:

- feature and fix pull requests target `develop`;
- release pull requests merge `develop` into `main`;
- Release Please creates a release pull request in `main`;
- after the release pull request is merged, GitHub Release and npm publishing run automatically;
- merge `main` back into `develop` after every release so `develop` receives the version, changelog, and lockfile updates.

When a merge commit is created manually, keep the merge message conventional, for example:

```text
chore(release): merge main back into develop
feat: merge feature/parser
```

## Hooks

Husky hooks are installed by `pnpm install`.

- `pre-commit` formats staged files with Biome through lint-staged and keeps the formatted result in the current commit.
- `commit-msg` validates Conventional Commits.
- `pre-push` runs tests and the build.


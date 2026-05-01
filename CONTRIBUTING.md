# Contributing

Thanks for taking the time to improve `srcset-kit`.

This package is intentionally small: it parses, validates, and serializes HTML
`srcset` values without runtime dependencies. Contributions are most helpful
when they keep that focus clear.

## Getting Started

Requirements:

- Node.js 22 or newer;
- pnpm 10 or newer.

Install dependencies:

```sh
pnpm install
```

Run the full local check:

```sh
pnpm run verify
```

`verify` is the same kind of check expected before a release. It runs formatting
checks, linting, type checking, tests, the production build, and package export
validation.

## Useful Commands

Use the full check before opening a pull request:

```sh
pnpm run verify
```

Use focused commands while developing:

```sh
pnpm run test
pnpm run test:watch
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm run format:check
pnpm run build
pnpm run pack:check
```

## Project Shape

The main files are:

- `src/parse.ts` for the public parser entrypoint;
- `src/parser.ts` for internal tokenization;
- `src/validator.ts` for validation rules and issue codes;
- `src/stringify.ts` for serialization;
- `src/types.ts` for public types;
- `src/errors.ts` for package-specific errors;
- `tests/index.test.ts` for behavior coverage;
- `README.md` for public examples and user-facing API docs.

## Public API Changes

Keep the public surface small and intentional. The runtime API is:

- `parse`;
- `validate`;
- `stringify`.

When changing public behavior, update these together:

- exported types in `src/types.ts`;
- exports in `src/index.ts`;
- user-facing examples in `README.md`;
- tests in `tests/index.test.ts`.

Please avoid adding dependencies unless the benefit is clearly worth the extra
package weight.

## Testing Guidelines

Add focused tests for the behavior you change.

Parser changes should cover cases like:

- commas inside URLs;
- `data:` URLs;
- relative and absolute URLs;
- query strings and fragments;
- whitespace and newlines;
- tolerant parsing of invalid descriptor sets.

Validator changes should assert stable issue codes, not only messages.

Stringifier changes should cover normalized output and round trips with
`parse()` when possible.

If object validation changes, add candidate-array tests in addition to string
input tests.

## Documentation Guidelines

Keep README examples short, copyable, and aligned with the actual API.

If a feature affects how users call `parse`, `validate`, or `stringify`, update
the README in the same pull request. Use the repository's TypeScript formatting
style in examples, including compact object and import braces:

```ts
import {parse, validate} from "srcset-kit";

validate([{url: "image.png", density: 1}]);
```

## Commits

This repository uses Conventional Commits. Examples:

```text
feat: add srcset parser
fix: keep descriptor whitespace valid
docs: improve validation examples
chore(release): merge main back into develop
```

Husky runs `commitlint` for commit messages.

## Branch Flow

The repository follows a GitFlow-like process without requiring the GitFlow CLI:

- feature and fix pull requests target `develop`;
- release pull requests merge `develop` into `main`;
- Release Please creates a release pull request in `main`;
- after the release pull request is merged, GitHub Release and npm publishing run automatically;
- merge `main` back into `develop` after every release so `develop` receives the version, changelog, and lockfile updates.

When a merge commit is created manually, keep the merge message conventional:

```text
chore(release): merge main back into develop
feat: merge feature/parser
```

## Hooks

Husky hooks are installed by `pnpm install`.

- `pre-commit` formats staged files with Biome through lint-staged and keeps the formatted result in the current commit.
- `commit-msg` validates Conventional Commits.
- `pre-push` runs tests and the build.

## Release Readiness

Before a release, make sure:

- `pnpm run verify` passes;
- README examples match the exported API;
- public type changes are covered by tests;
- `CHANGELOG.md` is ready for the release flow;
- package metadata in `package.json` still matches the published package;
- the license file remains `LICENSE.md`.

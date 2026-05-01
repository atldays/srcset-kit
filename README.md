# srcset-kit

Small, dependency-free tools for parsing, validating, and serializing HTML
`srcset` values.

`srcset-kit` is built for code that needs to understand responsive image
candidates without taking shortcuts. It handles `data:` URLs with commas,
normalizes whitespace, reports stable validation codes, and keeps URL strings
exactly as you provided them.

## Why

`srcset` looks simple until URLs contain commas:

```html
<img srcset="data:image/png;base64,AAAA 1x, /image@2x.png 2x" />
```

A plain `split(",")` breaks this value. `srcset-kit` tokenizes candidates with
the descriptor boundary in mind, so inline image data, query strings, fragments,
ports, relative URLs, and absolute URLs stay intact.

## Installation

```sh
pnpm add srcset-kit
```

```sh
npm install srcset-kit
```

```sh
yarn add srcset-kit
```

## Quick Start

```ts
import {parse, stringify, validate} from "srcset-kit";

const candidates = parse("image.png 1x, image@2x.png 2x");

const result = validate(candidates, {
  descriptor: "density",
});

if (result.valid) {
  stringify(result.candidates);
  // "image.png 1x, image@2x.png 2x"
}
```

## Parse

Parse a `srcset` string into clean candidate objects.

```ts
import {parse} from "srcset-kit";

parse("image.png");
// [{url: "image.png"}]

parse("image.png 1x, image@2x.png 2x");
// [
//   {url: "image.png", density: 1},
//   {url: "image@2x.png", density: 2},
// ]

parse("small.png 640w, large.png 1280w");
// [
//   {url: "small.png", width: 640},
//   {url: "large.png", width: 1280},
// ]
```

Parsing is tolerant by default. It keeps the usable URL candidate shape and
leaves validation decisions to `validate()`.

```ts
parse("image.png 1x 640w, image@2x.png 2x");
// [
//   {url: "image.png"},
//   {url: "image@2x.png", density: 2},
// ]
```

Use strict parsing when invalid `srcset` values should throw.

```ts
import {SrcsetValidationError, parse} from "srcset-kit";

try {
  parse("image.png 1x 640w", {strict: true});
} catch (error) {
  error instanceof SrcsetValidationError;
  // true
}
```

## Data URLs

Commas inside URLs are preserved.

```ts
parse("data:image/png;base64,AAAA 1x, /image@2x.png 2x");
// [
//   {url: "data:image/png;base64,AAAA", density: 1},
//   {url: "/image@2x.png", density: 2},
// ]

parse("data:image/svg+xml,%3Csvg%3E%3C/svg%3E 1x, /image.svg 2x");
// [
//   {url: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", density: 1},
//   {url: "/image.svg", density: 2},
// ]
```

## Validate

Validate a string or already parsed candidates. Validation never throws for
normal invalid input.

```ts
import {validate} from "srcset-kit";

validate("image.png 1x, image@2x.png 2x");
// {
//   valid: true,
//   descriptor: "density",
//   candidates: [
//     {url: "image.png", density: 1},
//     {url: "image@2x.png", density: 2},
//   ],
//   errors: [],
// }
```

Invalid input returns stable issue codes.

```ts
validate("image.png 1x, image@1x.png 1x");
// {
//   valid: false,
//   descriptor: "density",
//   candidates: [
//     {url: "image.png", density: 1},
//     {url: "image@1x.png", density: 1},
//   ],
//   errors: [
//     {
//       code: "duplicate-descriptor",
//       message: "...",
//       candidate: "image@1x.png 1x",
//       index: 1,
//     },
//   ],
// }
```

Validate candidate arrays directly.

```ts
validate([
  {url: "image.png", density: 1},
  {url: "image@2x.png", density: 2},
]);
// valid: true
```

### Descriptor Policy

Use `descriptor` when a caller expects a specific candidate style.

```ts
validate("small.png 640w, large.png 1280w", {
  descriptor: "width",
});
// valid: true

validate("image.png 1x, image@2x.png 2x", {
  descriptor: "width",
});
// valid: false

validate("image.png, image@2x.png 2x", {
  descriptor: "density",
});
// valid: true
```

A fallback candidate without a descriptor is treated as implicit `1x`, so it is
accepted by the density policy.

### URL Context

Use `baseUrl` when relative URLs should be checked in the context of a page URL.
Candidate URLs are not rewritten.

```ts
validate("/images/photo.jpg 1x", {
  baseUrl: "https://example.com/gallery/",
});
// valid: true

parse("/images/photo.jpg 1x");
// [{url: "/images/photo.jpg", density: 1}]
```

## Stringify

Serialize candidates into a normalized `srcset` string.

```ts
import {stringify} from "srcset-kit";

stringify([{url: "image.png"}]);
// "image.png"

stringify([{url: "image.png", density: 1.5}]);
// "image.png 1.5x"

stringify([{url: "image.png", width: 640}]);
// "image.png 640w"

stringify([
  {url: "image.png", density: 1},
  {url: "image@2x.png", density: 2},
]);
// "image.png 1x, image@2x.png 2x"
```

Strict stringifying validates before serializing.

```ts
stringify(
  [
    {url: "image.png", density: 1},
    {url: "image-copy.png", density: 1},
  ],
  {strict: true},
);
// throws SrcsetValidationError
```

## Round Trips

Use `parse()` and `stringify()` together to normalize whitespace while preserving
URLs.

```ts
stringify(parse(" image.png   1x,\n image@2x.png  2x "));
// "image.png 1x, image@2x.png 2x"

parse(
  stringify([
    {url: "data:image/png;base64,AAAA+BB==", density: 1},
    {url: "/image.png?w=100,h=200&fmt=webp", density: 2},
  ]),
);
// [
//   {url: "data:image/png;base64,AAAA+BB==", density: 1},
//   {url: "/image.png?w=100,h=200&fmt=webp", density: 2},
// ]
```

## Validation Rules

`srcset-kit` checks the parts that matter when accepting or transforming
`srcset` values:

- Empty `srcset` values are invalid.
- Candidate URLs must be non-empty.
- Relative URLs can be validated with `baseUrl`.
- A candidate may be fallback, density-based, or width-based.
- A candidate must not contain both density and width.
- Width descriptors must be positive integers.
- Density descriptors must be positive finite numbers.
- Width and density descriptors must not be mixed in one candidate set.
- Duplicate descriptors are invalid.
- A fallback candidate is equivalent to `1x`.
- Descriptor policy mismatches are reported with stable issue codes.

## API

```ts
import {
  parse,
  stringify,
  validate,
  SrcsetError,
  SrcsetValidationError,
  type DescriptorType,
  type ParseOptions,
  type SrcsetCandidate,
  type SrcsetValidationIssue,
  type StringifyOptions,
  type ValidateOptions,
  type ValidationResult,
} from "srcset-kit";
```

```ts
type SrcsetCandidate =
  | {url: string; density: number}
  | {url: string; width: number}
  | {url: string};

type ParseOptions = {
  strict?: boolean;
};

type ValidateOptions = {
  baseUrl?: string | URL;
  descriptor?: "width" | "density";
};

type StringifyOptions = {
  strict?: boolean;
};
```

## Package

- Runtime dependencies: none.
- Works in Node and browser environments.
- Source language: TypeScript.
- Published formats: ESM, CommonJS, and TypeScript declarations.
- Public API: `parse`, `validate`, `stringify`, types, and package-specific
  errors.

## Development

```sh
pnpm install
pnpm run verify
```

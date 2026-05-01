# srcset-kit

Tools for working with the HTML `srcset` attribute.

## Installation

```sh
pnpm add srcset-kit
```

## Usage

`srcset-kit` parses, validates, and serializes HTML `srcset` attribute values
without splitting blindly on commas.

```ts
import { parse, stringify, validate } from "srcset-kit";

parse("image.png 1x, image@2x.png 2x");
// [
//   { url: "image.png", density: 1 },
//   { url: "image@2x.png", density: 2 },
// ]

parse("small.png 640w, large.png 1280w");
// [
//   { url: "small.png", width: 640 },
//   { url: "large.png", width: 1280 },
// ]
```

### Validate

```ts
const result = validate("image.png 1x, image@2x.png 2x");

if (result.valid) {
  result.descriptorType;
  // "density"
}
```

Validation returns structured issue codes instead of throwing for normal invalid
input.

```ts
validate("image.png 1x, image@1x.png 1x");
// {
//   valid: false,
//   descriptorType: "density",
//   candidates: [
//     { url: "image.png", density: 1 },
//     { url: "image@1x.png", density: 1 },
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

Use `descriptor` to require a specific descriptor type for all candidates.

```ts
validate("small.png 640w, large.png 1280w", { descriptor: "width" });
// valid: true

validate("image.png 1x, image@2x.png 2x", { descriptor: "width" });
// valid: false

validate("image.png 1x, image@2x.png 2x", { descriptor: "density" });
// valid: true
```

Use `baseUrl` when relative URLs should be checked in the context of a page URL.
Candidate URLs are not rewritten.

```ts
validate("/image.png 1x", { baseUrl: "https://example.com" });
// valid: true
```

### Stringify

```ts
stringify([
  { url: "image.png", density: 1 },
  { url: "image@2x.png", density: 2 },
]);
// "image.png 1x, image@2x.png 2x"
```

### Strict Parse

`parse()` is tolerant by default. Use `strict: true` when invalid descriptor sets
should throw a package-specific `SrcsetValidationError`.

```ts
parse("image.png 1x 640w");
// [{ url: "image.png" }]

parse("image.png 1x 640w", { strict: true });
// throws SrcsetValidationError
```

### Data URLs

The parser keeps commas inside URLs, including `data:` URLs.

```ts
parse("data:image/png;base64,AAAA 1x, /image@2x.png 2x");
// [
//   { url: "data:image/png;base64,AAAA", density: 1 },
//   { url: "/image@2x.png", density: 2 },
// ]
```

## Development

```sh
pnpm install
pnpm run verify
```

## Package

- Runtime dependencies: none.
- Source language: TypeScript.
- Build tool: Rslib.
- Test runner: Rstest.
- Published formats: ESM, CommonJS, and TypeScript declarations.

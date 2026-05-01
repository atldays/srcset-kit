import {describe, expect, test} from "@rstest/core";

import {parse, type SrcsetCandidate, SrcsetValidationError, stringify, validate} from "../src";

function expectInvalidCodes(input: string | SrcsetCandidate[], codes: string[]) {
    const result = validate(input);

    expect(result.valid).toBe(false);
    expect(result.errors.map(({code}) => code)).toEqual(codes);
}

describe("public API", () => {
    test("exports named functions", () => {
        expect(typeof parse).toBe("function");
        expect(typeof validate).toBe("function");
        expect(typeof stringify).toBe("function");
    });
});

describe("parse", () => {
    test("parses empty and whitespace-only strings as no candidates", () => {
        expect(parse("")).toEqual([]);
        expect(parse("   \n\t  ")).toEqual([]);
    });

    test("parses a single URL without descriptor", () => {
        expect(parse("image.png")).toEqual([{url: "image.png"}]);
    });

    test("parses a single URL with 1x density", () => {
        expect(parse("image.png 1x")).toEqual([{url: "image.png", density: 1}]);
    });

    test("parses a single URL with decimal density", () => {
        expect(parse("image.png 1.5x")).toEqual([{url: "image.png", density: 1.5}]);
    });

    test("parses multiple density candidates", () => {
        expect(parse("image.png 1x, image@2x.png 2x")).toEqual([
            {url: "image.png", density: 1},
            {url: "image@2x.png", density: 2},
        ]);
    });

    test("parses multiple width candidates", () => {
        expect(parse("small.png 640w, large.png 1280w")).toEqual([
            {url: "small.png", width: 640},
            {url: "large.png", width: 1280},
        ]);
    });

    test("preserves relative URLs", () => {
        expect(parse("../image.png 1x, /image@2x.png 2x")).toEqual([
            {url: "../image.png", density: 1},
            {url: "/image@2x.png", density: 2},
        ]);
    });

    test("preserves absolute URLs", () => {
        expect(parse("https://example.com/image.png 1x")).toEqual([
            {url: "https://example.com/image.png", density: 1},
        ]);
    });

    test("preserves query strings", () => {
        expect(parse("/image.png?size=1,2&format=webp 1x, /image@2x.png?format=webp 2x")).toEqual([
            {url: "/image.png?size=1,2&format=webp", density: 1},
            {url: "/image@2x.png?format=webp", density: 2},
        ]);
    });

    test("preserves data URL commas", () => {
        expect(parse("data:image/png;base64,AAAA 1x, /image@2x.png 2x")).toEqual([
            {url: "data:image/png;base64,AAAA", density: 1},
            {url: "/image@2x.png", density: 2},
        ]);
    });

    test("preserves URL-encoded SVG data URLs", () => {
        expect(parse("data:image/svg+xml,%3Csvg%3E%3C/svg%3E 1x, /image.svg 2x")).toEqual([
            {url: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", density: 1},
            {url: "/image.svg", density: 2},
        ]);
    });

    test("handles leading whitespace, trailing whitespace, spaces, and newlines", () => {
        expect(parse(" \n image.png   1x,\n\timage@2x.png  \t 2x  ")).toEqual([
            {url: "image.png", density: 1},
            {url: "image@2x.png", density: 2},
        ]);
    });

    test("is tolerant of invalid descriptor sets by default", () => {
        expect(parse("image.png 1x 640w, image@2x.png 2x")).toEqual([
            {url: "image.png"},
            {url: "image@2x.png", density: 2},
        ]);
    });

    test("throws validation errors in strict mode", () => {
        expect(() => parse("image.png 1x, image@1x.png 1x", {strict: true})).toThrow(
            SrcsetValidationError,
        );
    });

    test("strict mode validates descriptor rules without URL context", () => {
        expect(parse("/image.png 1x", {strict: true})).toEqual([{url: "/image.png", density: 1}]);
    });

    test("preserves URLs with fragments", () => {
        expect(parse("image.png#section 1x")).toEqual([{url: "image.png#section", density: 1}]);
    });

    test("preserves URLs with ports", () => {
        expect(parse("http://localhost:3000/image.png 2x")).toEqual([
            {url: "http://localhost:3000/image.png", density: 2},
        ]);
    });

    test("skips empty entries between commas", () => {
        const result = parse("image.png 1x,   , image2.png 2x");

        expect(result).toEqual([
            {url: "image.png", density: 1},
            {url: "image2.png", density: 2},
        ]);
    });
});

describe("validate", () => {
    test("accepts valid string srcsets", () => {
        for (const input of [
            "a.png",
            "a.png 1x, b.png 2x",
            "a.png 1.5x, b.png 2x",
            "a.png 640w, b.png 1280w",
            "data:image/png;base64,AAAA 1x, /image@2x.png 2x",
        ]) {
            expect(validate(input).valid).toBe(true);
        }
    });

    test("returns the detected descriptor type", () => {
        expect(validate("a.png").descriptor).toBe("none");
        expect(validate("a.png 1x, b.png 2x").descriptor).toBe("density");
        expect(validate("a.png 640w, b.png 1280w").descriptor).toBe("width");
    });

    test("reports invalid string srcsets with stable codes", () => {
        expectInvalidCodes("", ["empty-srcset"]);
        expectInvalidCodes("   ", ["empty-srcset"]);
        expectInvalidCodes("a.png 1x, b.png 1x", ["duplicate-descriptor"]);
        expectInvalidCodes("a.png, b.png 1x", ["duplicate-descriptor"]);
        expectInvalidCodes("a.png 640w, b.png 2x", ["mixed-descriptors"]);
        expectInvalidCodes("a.png 0w", ["invalid-descriptor"]);
        expectInvalidCodes("a.png -1x", ["invalid-descriptor"]);
        expectInvalidCodes("a.png 0x", ["invalid-descriptor"]);
        expectInvalidCodes("a.png Infinityx", ["invalid-descriptor"]);
        expectInvalidCodes("a.png 1x 640w", ["multiple-descriptors"]);
        expectInvalidCodes("a.png 640w, b.png", ["mixed-descriptors"]);
    });

    test("requires width descriptors when descriptor is 'width'", () => {
        expect(validate("a.png 640w, b.png 1280w", {descriptor: "width"}).valid).toBe(true);

        const result = validate("a.png 1x, b.png 2x", {descriptor: "width"});

        expect(result.valid).toBe(false);
        expect(result.errors.map(({code}) => code)).toEqual([
            "mismatched-descriptor",
            "mismatched-descriptor",
        ]);
    });

    test("requires density descriptors when descriptor is 'density'", () => {
        expect(validate("a.png 1x, b.png 2x", {descriptor: "density"}).valid).toBe(true);

        const result = validate("a.png 640w, b.png 1280w", {descriptor: "density"});

        expect(result.valid).toBe(false);
        expect(result.errors.map(({code}) => code)).toEqual([
            "mismatched-descriptor",
            "mismatched-descriptor",
        ]);
    });

    test("allows fallback candidates with descriptor 'density'", () => {
        expect(validate("a.png, b.png 2x", {descriptor: "density"}).valid).toBe(true);
    });

    test("validates parsed candidate arrays", () => {
        expect(
            validate([
                {url: "a.png", density: 1},
                {url: "b.png", density: 2},
            ]).valid,
        ).toBe(true);

        const result = validate([
            {url: "a.png", width: 640},
            {url: "b.png", density: 2},
        ]);

        expect(result.valid).toBe(false);
        expect(result.errors.map(({code}) => code)).toEqual(["mixed-descriptors"]);
    });

    test("validates URLs relative to baseUrl when supplied", () => {
        expect(validate("/image.png 1x", {baseUrl: "https://example.com"}).valid).toBe(true);
        expect(validate("/image.png 1x", {baseUrl: "not a url"}).errors[0]?.code).toBe(
            "invalid-url",
        );
    });

    test("rejects candidate objects with NaN width", () => {
        expectInvalidCodes([{url: "a.png", width: NaN}], ["invalid-descriptor"]);
    });

    test("rejects candidate objects with Infinity density", () => {
        expectInvalidCodes([{url: "a.png", density: Infinity}], ["invalid-descriptor"]);
    });

    test("rejects candidate objects with negative width", () => {
        expectInvalidCodes([{url: "a.png", width: -100}], ["invalid-descriptor"]);
    });

    test("rejects candidate objects with empty url", () => {
        expectInvalidCodes([{url: "", width: 640}], ["invalid-url"]);
    });
});

describe("stringify", () => {
    test("serializes empty candidates", () => {
        expect(stringify([])).toBe("");
    });

    test("serializes fallback candidates", () => {
        expect(stringify([{url: "image.png"}])).toBe("image.png");
    });

    test("serializes density candidates", () => {
        expect(stringify([{url: "image.png", density: 1}])).toBe("image.png 1x");
    });

    test("serializes decimal density candidates", () => {
        expect(stringify([{url: "image.png", density: 1.5}])).toBe("image.png 1.5x");
    });

    test("serializes width candidates", () => {
        expect(stringify([{url: "image.png", width: 640}])).toBe("image.png 640w");
    });

    test("joins multiple candidates with comma-space", () => {
        expect(
            stringify([
                {url: "image.png", density: 1},
                {url: "image@2x.png", density: 2},
            ]),
        ).toBe("image.png 1x, image@2x.png 2x");
    });

    test("preserves data URLs", () => {
        expect(stringify([{url: "data:image/png;base64,AAAA", density: 1}])).toBe(
            "data:image/png;base64,AAAA 1x",
        );
    });

    test("preserves relative URL strings", () => {
        expect(stringify([{url: "../image.png", density: 1}])).toBe("../image.png 1x");
    });

    test("throws in strict mode for invalid candidates", () => {
        expect(() =>
            stringify(
                [
                    {url: "a.png", density: 1},
                    {url: "b.png", density: 1},
                ],
                {strict: true},
            ),
        ).toThrow(SrcsetValidationError);
    });

    test("round trips parsed strings with normalized whitespace", () => {
        expect(stringify(parse(" image.png   1x,\n image@2x.png  2x "))).toBe(
            "image.png 1x, image@2x.png 2x",
        );
    });

    test("round trips candidates through stringify and parse", () => {
        const candidates: SrcsetCandidate[] = [
            {url: "data:image/png;base64,AAAA", density: 1},
            {url: "/image@2x.png", density: 2},
        ];

        expect(parse(stringify(candidates))).toEqual(candidates);
    });

    test("round trips data URLs and query strings with commas", () => {
        const candidates: SrcsetCandidate[] = [
            {url: "data:image/png;base64,AAAA+BB==", density: 1},
            {url: "/image.png?w=100,h=200&fmt=webp", density: 2},
        ];

        expect(parse(stringify(candidates))).toEqual(candidates);
    });
});

import type {SrcsetCandidate} from "./types";

export type InternalDescriptor =
    | {kind: "density"; value: number; raw: string}
    | {kind: "width"; value: number; raw: string}
    | {kind: "invalid"; raw: string};

export type InternalCandidate = {
    candidate: SrcsetCandidate;
    descriptors: InternalDescriptor[];
    index: number;
    raw: string;
    url: string;
};

const ASCII_WHITESPACE = /[\t\n\f\r ]/u;
const DENSITY_DESCRIPTOR = /^(\d+(?:\.\d+)?|\.\d+)x$/u;
const WIDTH_DESCRIPTOR = /^(\d+)w$/u;

export function parseInternal(input: string): InternalCandidate[] {
    return splitCandidates(input).map((segment, index) => parseCandidateSegment(segment, index));
}

function splitCandidates(input: string): string[] {
    const segments: string[] = [];
    const length = input.length;
    let index = 0;

    while (index < length) {
        while (index < length && isCandidateLeadingIgnored(input[index])) {
            index += 1;
        }

        if (index >= length) {
            break;
        }

        const start = index;
        let seenUrlWhitespace = false;

        while (index < length) {
            const char = input[index];

            if (isAsciiWhitespace(char)) {
                seenUrlWhitespace = true;
                index += 1;
                continue;
            }

            if (char === "," && (seenUrlWhitespace || isFallbackSeparator(input, index))) {
                break;
            }

            index += 1;
        }

        const segment = input.slice(start, index).trim();

        if (segment.length > 0) {
            segments.push(segment);
        }

        if (input[index] === ",") {
            index += 1;
        }
    }

    return segments;
}

function parseCandidateSegment(segment: string, index: number): InternalCandidate {
    const [url = "", ...descriptorTokens] = segment.split(ASCII_WHITESPACE).filter(Boolean);
    const descriptors = descriptorTokens.map(parseDescriptor);
    const descriptor = descriptors[0];

    return {
        candidate: buildCandidate(url, descriptors.length === 1 ? descriptor : undefined),
        descriptors,
        index,
        raw: segment,
        url,
    };
}

function parseDescriptor(token: string): InternalDescriptor {
    const width = WIDTH_DESCRIPTOR.exec(token);

    if (width) {
        return {
            kind: "width",
            raw: token,
            value: Number(width[1]),
        };
    }

    const density = DENSITY_DESCRIPTOR.exec(token);

    if (density) {
        return {
            kind: "density",
            raw: token,
            value: Number(density[1]),
        };
    }

    return {
        kind: "invalid",
        raw: token,
    };
}

function buildCandidate(url: string, descriptor?: InternalDescriptor): SrcsetCandidate {
    if (descriptor?.kind === "density") {
        return {
            url,
            density: descriptor.value,
        };
    }

    if (descriptor?.kind === "width") {
        return {
            url,
            width: descriptor.value,
        };
    }

    return {url};
}

function isAsciiWhitespace(char: string | undefined): boolean {
    return char !== undefined && ASCII_WHITESPACE.test(char);
}

function isCandidateLeadingIgnored(char: string | undefined): boolean {
    return char === "," || isAsciiWhitespace(char);
}

function isFallbackSeparator(input: string, commaIndex: number): boolean {
    let index = commaIndex + 1;

    while (index < input.length && isAsciiWhitespace(input[index])) {
        index += 1;
    }

    return index === input.length || index > commaIndex + 1;
}

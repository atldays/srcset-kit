import {SrcsetValidationError} from "./errors";
import type {SrcsetCandidate, StringifyOptions} from "./types";
import {validate} from "./validator";

export function stringify(candidates: SrcsetCandidate[], options: StringifyOptions = {}): string {
    if (options.strict) {
        const result = validate(candidates);

        if (!result.valid) {
            throw new SrcsetValidationError(result.errors);
        }
    }

    return candidates.map(stringifyCandidate).join(", ");
}

function stringifyCandidate(candidate: SrcsetCandidate): string {
    if ("density" in candidate) {
        return `${candidate.url} ${formatNumber(candidate.density)}x`;
    }

    if ("width" in candidate) {
        return `${candidate.url} ${formatNumber(candidate.width)}w`;
    }

    return candidate.url;
}

function formatNumber(value: number): string {
    return String(value);
}

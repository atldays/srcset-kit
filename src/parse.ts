import {SrcsetValidationError} from "./errors";
import {parseInternal} from "./parser";
import type {ParseOptions, SrcsetCandidate} from "./types";
import {validateParsedCandidates} from "./validator";

export function parse(input: string, options: ParseOptions = {}): SrcsetCandidate[] {
    const parsed = parseInternal(input);

    if (options.strict) {
        const result = validateParsedCandidates(parsed, {
            inputWasEmpty: input.trim().length === 0,
        });

        if (!result.valid) {
            throw new SrcsetValidationError(result.errors);
        }
    }

    return parsed.map(({candidate}) => candidate);
}

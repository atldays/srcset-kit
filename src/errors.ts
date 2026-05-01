import type {SrcsetValidationIssue} from "./types";

export class SrcsetError extends Error {
    override name = "SrcsetError";
}

export class SrcsetParseError extends SrcsetError {
    override name = "SrcsetParseError";
}

export class SrcsetValidationError extends SrcsetError {
    override name = "SrcsetValidationError";

    public constructor(public readonly errors: SrcsetValidationIssue[]) {
        super(formatValidationMessage(errors));
    }
}

function formatValidationMessage(errors: SrcsetValidationIssue[]): string {
    if (errors.length === 0) {
        return "Invalid srcset.";
    }

    return `Invalid srcset: ${errors.map((error) => error.code).join(", ")}.`;
}

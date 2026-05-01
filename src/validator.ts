import {type InternalCandidate, parseInternal} from "./parser";
import type {
    DescriptorType,
    SrcsetCandidate,
    SrcsetValidationIssue,
    ValidateOptions,
    ValidationResult,
} from "./types";

type ParsedValidationOptions = ValidateOptions & {
    inputWasEmpty?: boolean;
};

type RuntimeDescriptor =
    | {kind: "density"; value: number}
    | {kind: "width"; value: number}
    | {kind: "none"}
    | {kind: "invalid"};

type NormalizedCandidate = {
    descriptor: RuntimeDescriptor;
    index: number;
    raw: string;
    url: string;
};

type IssueCode = SrcsetValidationIssue["code"];

export function validate(
    input: string | SrcsetCandidate[],
    options: ValidateOptions = {},
): ValidationResult {
    if (typeof input === "string") {
        const parsed = parseInternal(input);

        return validateNormalized(
            parsed.map(normalizeParsedCandidate),
            parsed.map(({candidate}) => candidate),
            options,
            input.trim().length === 0,
            parsed.flatMap(descriptorIssues),
            false,
        );
    }

    return validateNormalized(
        input.map(normalizeCandidateObject),
        input,
        options,
        input.length === 0,
    );
}

export function validateParsedCandidates(
    parsed: InternalCandidate[],
    options: ParsedValidationOptions = {},
): ValidationResult {
    return validateNormalized(
        parsed.map(normalizeParsedCandidate),
        parsed.map(({candidate}) => candidate),
        options,
        options.inputWasEmpty,
        parsed.flatMap(descriptorIssues),
        false,
    );
}

function validateNormalized(
    normalized: NormalizedCandidate[],
    candidates: SrcsetCandidate[],
    options: ValidateOptions,
    inputWasEmpty = false,
    parserIssues: SrcsetValidationIssue[] = [],
    includeObjectShapeIssues = true,
): ValidationResult {
    const errors = [
        ...emptySrcsetIssues(normalized, inputWasEmpty),
        ...parserIssues,
        ...(includeObjectShapeIssues ? objectShapeIssues(normalized) : []),
        ...urlIssues(normalized, options.baseUrl),
        ...descriptorValueIssues(normalized),
        ...descriptorSetIssues(normalized, options),
    ];

    return buildValidationResult(candidates, getDescriptorType(normalized), errors);
}

function descriptorIssues(candidate: InternalCandidate): SrcsetValidationIssue[] {
    if (candidate.descriptors.length > 1) {
        return [
            issue(
                "multiple-descriptors",
                "A srcset candidate must not contain multiple descriptors.",
                candidate,
            ),
        ];
    }

    const descriptor = candidate.descriptors[0];

    return descriptor?.kind === "invalid"
        ? [issue("invalid-descriptor", `Invalid srcset descriptor "${descriptor.raw}".`, candidate)]
        : [];
}

function normalizeParsedCandidate(candidate: InternalCandidate): NormalizedCandidate {
    const descriptor = candidate.descriptors[0];

    return {
        descriptor:
            candidate.descriptors.length === 1 && descriptor !== undefined
                ? toRuntimeDescriptor(
                      descriptor.kind,
                      "value" in descriptor ? descriptor.value : undefined,
                  )
                : {kind: "none"},
        index: candidate.index,
        raw: candidate.raw,
        url: candidate.url,
    };
}

function normalizeCandidateObject(candidate: SrcsetCandidate, index: number): NormalizedCandidate {
    const record = candidate as SrcsetCandidate & {
        density?: unknown;
        width?: unknown;
        url?: unknown;
    };
    const hasDensity = "density" in record;
    const hasWidth = "width" in record;

    return {
        descriptor:
            hasDensity && hasWidth
                ? {kind: "invalid"}
                : hasDensity
                  ? toRuntimeDescriptor("density", record.density)
                  : hasWidth
                    ? toRuntimeDescriptor("width", record.width)
                    : {kind: "none"},
        index,
        raw: formatCandidate(candidate),
        url: typeof record.url === "string" ? record.url : "",
    };
}

function toRuntimeDescriptor(
    kind: "density" | "width" | "invalid",
    value: unknown,
): RuntimeDescriptor {
    if (kind === "invalid" || typeof value !== "number") {
        return {kind: "invalid"};
    }

    return {kind, value};
}

function emptySrcsetIssues(
    candidates: NormalizedCandidate[],
    inputWasEmpty: boolean,
): SrcsetValidationIssue[] {
    return inputWasEmpty || candidates.length === 0
        ? [issue("empty-srcset", "The srcset attribute must contain at least one candidate.")]
        : [];
}

function objectShapeIssues(candidates: NormalizedCandidate[]): SrcsetValidationIssue[] {
    return candidates
        .filter(({descriptor}) => descriptor.kind === "invalid")
        .map((candidate) =>
            issue("invalid-descriptor", "Invalid srcset candidate descriptor.", candidate),
        );
}

function urlIssues(
    candidates: NormalizedCandidate[],
    baseUrl?: string | URL,
): SrcsetValidationIssue[] {
    return candidates.flatMap((candidate) => {
        if (candidate.url.trim().length === 0) {
            return [issue("invalid-url", "A srcset candidate URL must not be empty.", candidate)];
        }

        if (baseUrl === undefined || typeof URL === "undefined") {
            return [];
        }

        try {
            new URL(candidate.url, baseUrl);
            return [];
        } catch {
            return [
                issue(
                    "invalid-url",
                    "A srcset candidate URL is not valid relative to the base URL.",
                    candidate,
                ),
            ];
        }
    });
}

function descriptorValueIssues(candidates: NormalizedCandidate[]): SrcsetValidationIssue[] {
    return candidates.flatMap((candidate) => {
        const {descriptor} = candidate;

        if (
            descriptor.kind === "width" &&
            (!Number.isInteger(descriptor.value) || descriptor.value <= 0)
        ) {
            return [
                issue(
                    "invalid-descriptor",
                    "Width descriptors must be positive integers.",
                    candidate,
                ),
            ];
        }

        if (
            descriptor.kind === "density" &&
            (!Number.isFinite(descriptor.value) || descriptor.value <= 0)
        ) {
            return [
                issue(
                    "invalid-descriptor",
                    "Density descriptors must be positive finite numbers.",
                    candidate,
                ),
            ];
        }

        return [];
    });
}

function descriptorSetIssues(
    candidates: NormalizedCandidate[],
    options: ValidateOptions,
): SrcsetValidationIssue[] {
    const seen = new Map<string, NormalizedCandidate>();
    const kinds = new Set<RuntimeDescriptor["kind"]>();
    const issues: SrcsetValidationIssue[] = [];

    for (const candidate of candidates) {
        kinds.add(candidate.descriptor.kind);

        if (options.descriptor === "width" && candidate.descriptor.kind !== "width") {
            issues.push(
                issue(
                    "mismatched-descriptor",
                    "Every candidate must use a width descriptor.",
                    candidate,
                ),
            );
        }

        if (
            options.descriptor === "density" &&
            candidate.descriptor.kind !== "density" &&
            candidate.descriptor.kind !== "none"
        ) {
            issues.push(
                issue(
                    "mismatched-descriptor",
                    "Every candidate must use a density descriptor.",
                    candidate,
                ),
            );
        }

        const key = getDescriptorKey(candidate.descriptor);

        if (key === undefined) {
            continue;
        }

        if (seen.has(key)) {
            issues.push(
                issue(
                    "duplicate-descriptor",
                    `Duplicate srcset descriptor "${formatDescriptorKey(key)}".`,
                    candidate,
                ),
            );
        } else {
            seen.set(key, candidate);
        }
    }

    if (kinds.has("width") && (kinds.has("density") || kinds.has("none"))) {
        issues.push(
            issue(
                "mixed-descriptors",
                "Width descriptors must not be mixed with density or fallback candidates.",
            ),
        );
    }

    return issues;
}

function getDescriptorKey(descriptor: RuntimeDescriptor): string | undefined {
    if (descriptor.kind === "invalid") {
        return undefined;
    }

    return descriptor.kind === "none" ? "density:1" : `${descriptor.kind}:${descriptor.value}`;
}

function formatDescriptorKey(key: string): string {
    const [kind, value] = key.split(":");

    return kind === "width" ? `${value}w` : `${value}x`;
}

function getDescriptorType(candidates: NormalizedCandidate[]): DescriptorType {
    if (candidates.some(({descriptor}) => descriptor.kind === "width")) {
        return "width";
    }

    if (candidates.some(({descriptor}) => descriptor.kind === "density")) {
        return "density";
    }

    return "none";
}

function buildValidationResult(
    candidates: SrcsetCandidate[],
    descriptorType: DescriptorType,
    errors: SrcsetValidationIssue[],
): ValidationResult {
    return errors.length === 0
        ? {candidates, descriptorType, errors: [], valid: true}
        : {candidates, descriptorType, errors, valid: false};
}

function issue(
    code: IssueCode,
    message: string,
    candidate?: Pick<NormalizedCandidate, "index" | "raw">,
): SrcsetValidationIssue {
    return candidate === undefined
        ? {code, message}
        : {candidate: candidate.raw, code, index: candidate.index, message};
}

function formatCandidate(candidate: SrcsetCandidate): string {
    const record = candidate as SrcsetCandidate & {
        density?: unknown;
        width?: unknown;
    };

    if ("width" in record) {
        return `${record.url} ${String(record.width)}w`;
    }

    if ("density" in record) {
        return `${record.url} ${String(record.density)}x`;
    }

    return record.url;
}

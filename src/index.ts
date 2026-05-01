import {parse} from "./parse";
import {stringify} from "./stringify";
import {validate} from "./validator";

export {SrcsetError, SrcsetParseError, SrcsetValidationError} from "./errors";
export {parse} from "./parse";
export {stringify} from "./stringify";
export type {
    DensityCandidate,
    DescriptorType,
    FallbackCandidate,
    ParseOptions,
    SrcsetCandidate,
    SrcsetValidationIssue,
    StringifyOptions,
    ValidateOptions,
    ValidationResult,
    WidthCandidate,
} from "./types";
export {validate} from "./validator";

const srcset = {
    parse,
    stringify,
    validate,
};

export default srcset;

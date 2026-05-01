export type DensityCandidate = {
    url: string;
    density: number;
};

export type WidthCandidate = {
    url: string;
    width: number;
};

export type FallbackCandidate = {
    url: string;
};

export type SrcsetCandidate = DensityCandidate | WidthCandidate | FallbackCandidate;

export type ParseOptions = {
    strict?: boolean;
};

export type ValidateOptions = {
    baseUrl?: string | URL;
    descriptor?: "width" | "density";
};

export type StringifyOptions = {
    strict?: boolean;
};

export type DescriptorType = "density" | "width" | "none";

export type SrcsetValidationIssue = {
    code:
        | "empty-srcset"
        | "invalid-url"
        | "invalid-descriptor"
        | "duplicate-descriptor"
        | "mixed-descriptors"
        | "mismatched-descriptor"
        | "multiple-descriptors";
    message: string;
    candidate?: string;
    index?: number;
};

export type ValidationResult =
    | {
          valid: true;
          candidates: SrcsetCandidate[];
          descriptor: DescriptorType;
          errors: [];
      }
    | {
          valid: false;
          candidates: SrcsetCandidate[];
          descriptor: DescriptorType;
          errors: SrcsetValidationIssue[];
      };

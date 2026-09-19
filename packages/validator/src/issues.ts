export type ValidationSeverity = "error" | "warning";

export type FailureCategory =
  | "ART"
  | "RIG"
  | "RETARGET"
  | "ANIMATION"
  | "RUNTIME"
  | "EDITOR"
  | "SPEC";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  category: FailureCategory;
  message: string;
  target?: string; // Bone ID, Slot ID, or Field path
}

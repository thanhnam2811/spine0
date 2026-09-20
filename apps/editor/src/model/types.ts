import type {
  AnatomyEnvelope,
  AnimationTemplate,
  BoneOverride,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";
import type { CharacterMetrics, ValidationIssue } from "@animation-factory/validator";

export type EditorMode = "setup" | "preview";

export type SelectionTarget =
  | { type: "bone"; id: string }
  | { type: "slot"; id: string }
  | { type: "part"; id: string }
  | null;

export interface OverlaySettings {
  skeleton: boolean;
  ground: boolean;
  clearanceProxies: boolean;
  envelopeBounds: boolean;
  handles: boolean;
}

export interface FamilyFitStatus {
  assignedFamily: string;
  fitsAssignedEnvelope: boolean;
  materialOverrideRatio: number;
  familyScores: Record<string, { fits: boolean; issueCount: number }>;
  recommendedFamily: string;
}

export interface ValidationSummary {
  isValid: boolean;
  issues: ValidationIssue[];
  metrics: CharacterMetrics;
}

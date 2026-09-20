import type {
  AnatomyEnvelope,
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";
import {
  validateCharacter,
  validateFamilyAssignment,
  computeCharacterMetrics
} from "@animation-factory/validator";
import type {
  EditorMode,
  FamilyFitStatus,
  OverlaySettings,
  SelectionTarget,
  ValidationSummary
} from "./types.js";

export class EditorDocument {
  public character: CharacterDefinition;
  public targetRig: RigDefinition;
  public targetEnvelope: AnatomyEnvelope;

  public availableRigs: Record<string, RigDefinition>;
  public availableEnvelopes: Record<string, AnatomyEnvelope>;
  public availableClips: Record<string, AnimationTemplate>;

  public selection: SelectionTarget = null;
  public mode: EditorMode = "setup";
  public activeClipId: string = "idle";
  public previewTime: number = 0.0;
  public isPlaying: boolean = false;
  public playbackSpeed: number = 1.0;

  public overlays: OverlaySettings = {
    skeleton: true,
    ground: true,
    clearanceProxies: true,
    envelopeBounds: true,
    handles: true
  };

  public validation: ValidationSummary;
  public familyFit: FamilyFitStatus;

  private listeners: Set<() => void> = new Set();

  constructor(
    character: CharacterDefinition,
    rigs: Record<string, RigDefinition>,
    envelopes: Record<string, AnatomyEnvelope>,
    clips: Record<string, AnimationTemplate>
  ) {
    this.character = JSON.parse(JSON.stringify(character));
    this.availableRigs = rigs;
    this.availableEnvelopes = envelopes;
    this.availableClips = clips;

    this.targetRig = rigs[this.character.rig] ?? Object.values(rigs)[0];
    this.targetEnvelope = envelopes[this.character.rig] ?? Object.values(envelopes)[0];

    this.validation = this.computeValidation();
    this.familyFit = this.computeFamilyFit();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify(): void {
    this.validation = this.computeValidation();
    this.familyFit = this.computeFamilyFit();
    for (const listener of this.listeners) {
      listener();
    }
  }

  public computeValidation(): ValidationSummary {
    const res = validateCharacter(this.character, this.targetRig, this.targetEnvelope);
    const hasErrors = res.issues.some((i) => i.severity === "error");
    return {
      isValid: !hasErrors,
      issues: res.issues,
      metrics: res.metrics
    };
  }

  public computeFamilyFit(): FamilyFitStatus {
    const res = validateFamilyAssignment(
      this.character,
      this.availableRigs,
      this.availableEnvelopes
    );

    const familyScores: Record<string, { fits: boolean; issueCount: number }> = {};
    for (const [familyId, rig] of Object.entries(this.availableRigs)) {
      const env = this.availableEnvelopes[familyId];
      if (env) {
        const val = validateCharacter(this.character, rig, env);
        familyScores[familyId] = {
          fits: !val.issues.some((i) => i.severity === "error"),
          issueCount: val.issues.length
        };
      }
    }

    const metrics = computeCharacterMetrics(this.targetRig, this.character);

    return {
      assignedFamily: res.assignedFamily,
      fitsAssignedEnvelope: res.fitsAssignedEnvelope,
      materialOverrideRatio: metrics.material_override_ratio,
      familyScores,
      recommendedFamily: res.recommendedFamily ?? this.character.rig
    };
  }

  public setSelection(sel: SelectionTarget): void {
    this.selection = sel;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public setMode(mode: EditorMode): void {
    this.mode = mode;
    this.isPlaying = false;
    this.previewTime = 0.0;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public setActiveClip(clipId: string): void {
    this.activeClipId = clipId;
    this.previewTime = 0.0;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public setPreviewTime(time: number): void {
    this.previewTime = Math.max(0.0, time);
    for (const listener of this.listeners) {
      listener();
    }
  }

  public togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public toggleOverlay(key: keyof OverlaySettings): void {
    this.overlays[key] = !this.overlays[key];
    for (const listener of this.listeners) {
      listener();
    }
  }

  public exportJson(): string {
    return JSON.stringify(this.character, null, 2);
  }
}

/**
 * Deep freezes an object and its nested properties.
 * Useful for development and test assertions to guarantee canonical data immutability.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

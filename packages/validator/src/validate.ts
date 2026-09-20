import type {
  AnatomyEnvelope,
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";
import { CANONICAL_BONE_IDS } from "@animation-factory/schema";
import type { ValidationIssue } from "./issues.js";
import { computeCharacterMetrics, type CharacterMetrics } from "./metrics.js";

const REQUIRED_CANONICAL_PARTS = [
  "head",
  "torso",
  "pelvis",
  "upper_arm_R",
  "forearm_R",
  "hand_R",
  "upper_arm_L",
  "forearm_L",
  "hand_L",
  "thigh_R",
  "shin_R",
  "foot_R",
  "thigh_L",
  "shin_L",
  "foot_L"
] as const;

/**
 * Validates canonical rig integrity.
 */
export function validateRig(rig: RigDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (rig.version !== 1) {
    issues.push({
      code: "SCHEMA_VERSION_MISMATCH",
      severity: "error",
      category: "SPEC",
      message: `Unsupported rig version ${rig.version}. Expected 1.`,
      target: "version"
    });
  }

  const boneIds = new Set<string>();
  for (const bone of rig.bones) {
    if (boneIds.has(bone.id)) {
      issues.push({
        code: "RIG_DUPLICATE_BONE",
        severity: "error",
        category: "RIG",
        message: `Duplicate bone ID '${bone.id}' in rig.`,
        target: bone.id
      });
    }
    boneIds.add(bone.id);
  }

  // Check parents exist and detect cycles
  for (const bone of rig.bones) {
    if (bone.parent && !boneIds.has(bone.parent)) {
      issues.push({
        code: "RIG_BAD_HIERARCHY",
        severity: "error",
        category: "RIG",
        message: `Bone '${bone.id}' references non-existent parent '${bone.parent}'.`,
        target: bone.id
      });
    }

    // Cycle detection
    let current: string | null = bone.parent;
    const visited = new Set<string>([bone.id]);
    while (current) {
      if (visited.has(current)) {
        issues.push({
          code: "RIG_BAD_HIERARCHY",
          severity: "error",
          category: "RIG",
          message: `Cycle detected in hierarchy involving bone '${bone.id}'.`,
          target: bone.id
        });
        break;
      }
      visited.add(current);
      const parentDef = rig.bones.find((b) => b.id === current);
      current = parentDef ? parentDef.parent : null;
    }
  }

  // Canonical 17 bones presence check for humanoid
  if (rig.family.startsWith("humanoid")) {
    for (const requiredBone of CANONICAL_BONE_IDS) {
      if (!boneIds.has(requiredBone)) {
        issues.push({
          code: "RIG_UNKNOWN_BONE",
          severity: "error",
          category: "RIG",
          message: `Canonical bone '${requiredBone}' missing from humanoid rig '${rig.id}'.`,
          target: requiredBone
        });
      }
    }
  }

  // Slot validation
  const slotIds = new Set<string>();
  for (const slot of rig.slots) {
    if (slotIds.has(slot.id)) {
      issues.push({
        code: "RIG_DUPLICATE_SLOT",
        severity: "error",
        category: "RIG",
        message: `Duplicate slot ID '${slot.id}' in rig.`,
        target: slot.id
      });
    }
    slotIds.add(slot.id);

    if (!boneIds.has(slot.bone)) {
      issues.push({
        code: "RIG_UNKNOWN_BONE",
        severity: "error",
        category: "RIG",
        message: `Slot '${slot.id}' binds to non-existent bone '${slot.bone}'.`,
        target: slot.id
      });
    }
  }

  return issues;
}

/**
 * Validates a character authoring file against its canonical rig and optional anatomy envelope.
 */
export function validateCharacter(
  character: CharacterDefinition,
  rig: RigDefinition,
  envelope?: AnatomyEnvelope
): { issues: ValidationIssue[]; metrics: CharacterMetrics } {
  const issues: ValidationIssue[] = [];
  const metrics = computeCharacterMetrics(rig, character);

  if (character.version !== 1) {
    issues.push({
      code: "SCHEMA_VERSION_MISMATCH",
      severity: "error",
      category: "SPEC",
      message: `Unsupported character version ${character.version}. Expected 1.`,
      target: "version"
    });
  }

  if (character.rig !== rig.id) {
    issues.push({
      code: "RIG_MISMATCH",
      severity: "error",
      category: "SPEC",
      message: `Character rig '${character.rig}' does not match target rig '${rig.id}'.`,
      target: "rig"
    });
  }

  const slotMap = new Set(rig.slots.map((s) => s.id));
  const boneMap = new Map(rig.bones.map((b) => [b.id, b]));

  // Check required parts
  for (const requiredPart of REQUIRED_CANONICAL_PARTS) {
    if (!character.parts[requiredPart]) {
      issues.push({
        code: "ART_MISSING_PART",
        severity: "error",
        category: "ART",
        message: `Required part '${requiredPart}' is missing in character '${character.id}'.`,
        target: requiredPart
      });
    }
  }

  // Check parts metadata
  for (const [partKey, partDef] of Object.entries(character.parts)) {
    if (!slotMap.has(partDef.slot)) {
      issues.push({
        code: "ANIM_UNKNOWN_SLOT",
        severity: "error",
        category: "SPEC",
        message: `Part '${partKey}' binds to unknown slot '${partDef.slot}'.`,
        target: partKey
      });
    }

    if (!partDef.texture || partDef.texture.trim().length === 0) {
      issues.push({
        code: "ART_INVALID_TEXTURE",
        severity: "error",
        category: "ART",
        message: `Part '${partKey}' has empty texture path.`,
        target: partKey
      });
    }

    // Pivot range check
    const [px, py] = partDef.pivot;
    if (px < 0.0 || px > 1.0 || py < 0.0 || py > 1.0 || !Number.isFinite(px) || !Number.isFinite(py)) {
      issues.push({
        code: "SPEC_PIVOT_OUT_OF_RANGE",
        severity: "error",
        category: "SPEC",
        message: `Pivot [${px}, ${py}] on part '${partKey}' is outside normalized [0, 1] range.`,
        target: partKey
      });
    }

    // Distal anchor range check
    if (partDef.distalAnchor) {
      const [ax, ay] = partDef.distalAnchor;
      if (ax < 0.0 || ax > 1.0 || ay < 0.0 || ay > 1.0 || !Number.isFinite(ax) || !Number.isFinite(ay)) {
        issues.push({
          code: "SPEC_ANCHOR_OUT_OF_RANGE",
          severity: "error",
          category: "SPEC",
          message: `Distal anchor [${ax}, ${ay}] on part '${partKey}' is outside normalized [0, 1] range.`,
          target: partKey
        });
      }
    }
  }

  // Check bone overrides
  if (character.boneOverrides) {
    for (const [boneId, override] of Object.entries(character.boneOverrides)) {
      if (!boneMap.has(boneId)) {
        issues.push({
          code: "RIG_UNKNOWN_BONE",
          severity: "error",
          category: "RIG",
          message: `Bone override specified for non-existent bone '${boneId}'.`,
          target: boneId
        });
        continue;
      }

      // Check for forbidden fields via runtime inspection
      const rawKeys = Object.keys(override);
      for (const key of rawKeys) {
        if (key === "scaleX" || key === "scaleY") {
          issues.push({
            code: "RIG_INVALID_OVERRIDE_FIELD",
            severity: "error",
            category: "RIG",
            message: `Scale overrides '${key}' are forbidden on bone '${boneId}' in V0.`,
            target: boneId
          });
        }
      }

      if (override.length !== undefined && override.length <= 0) {
        issues.push({
          code: "RIG_LENGTH_OVERRIDE_HIGH",
          severity: "error",
          category: "RIG",
          message: `Bone length for '${boneId}' must be positive, got ${override.length}.`,
          target: boneId
        });
      }
    }
  }

  // Check material override ratio gate
  if (metrics.material_override_ratio > 0.40) {
    issues.push({
      code: "RIG_OVERRIDE_RATIO_HIGH",
      severity: "error",
      category: "RIG",
      message: `Material override ratio ${(metrics.material_override_ratio * 100).toFixed(1)}% exceeds 40% threshold (${metrics.material_override_count}/17 bones). Character requires an alternate Rig Family.`,
      target: "boneOverrides"
    });
  }

  // Anatomy envelope validation
  if (envelope) {
    const H = character.referenceHeight;
    const overrides = character.boneOverrides ?? {};

    const getLen = (boneId: string): number => {
      const o = overrides[boneId];
      if (o && o.length !== undefined) return o.length;
      return boneMap.get(boneId)?.length ?? 0;
    };

    const getPos = (boneId: string): [number, number] => {
      const b = boneMap.get(boneId);
      const o = overrides[boneId];
      return [(b?.x ?? 0) + (o?.x ?? 0), (b?.y ?? 0) + (o?.y ?? 0)];
    };

    const headLength = getLen("head");
    const torsoLength = getLen("torso");
    const upperArmL = getLen("upper_arm_L");
    const forearmL = getLen("forearm_L");
    const thighL = getLen("thigh_L");
    const shinL = getLen("shin_L");

    const [armLx] = getPos("upper_arm_L");
    const [armRx] = getPos("upper_arm_R");
    const shoulderSpan = Math.abs(armRx - armLx);

    const [thighLx] = getPos("thigh_L");
    const [thighRx] = getPos("thigh_R");
    const hipSpan = Math.abs(thighRx - thighLx);

    const checkRatio = (name: string, value: number) => {
      const range = envelope.ratios[name];
      if (!range) return;
      if (value < range.min || value > range.max) {
        issues.push({
          code: "SPEC_OUTSIDE_ENVELOPE",
          severity: "error",
          category: "SPEC",
          message: `Anatomy ratio '${name}' = ${value.toFixed(3)} is outside permitted envelope [${range.min}, ${range.max}].`,
          target: name
        });
      }
    };

    if (H > 0) {
      checkRatio("head_to_height", headLength / H);
      checkRatio("torso_to_height", torsoLength / H);
      checkRatio("shoulder_span_to_height", shoulderSpan / H);
      checkRatio("hip_span_to_height", hipSpan / H);
      checkRatio("upper_arm_to_height", upperArmL / H);
      if (upperArmL > 0) {
        checkRatio("forearm_to_upper_arm", forearmL / upperArmL);
      }
      checkRatio("thigh_to_height", thighL / H);
      if (thighL > 0) {
        checkRatio("shin_to_thigh", shinL / thighL);
      }
      checkRatio("total_leg_to_height", (thighL + shinL) / H);
    }
  }

  return { issues, metrics };
}

/**
 * Validates an animation template against a canonical rig definition.
 */
export function validateAnimation(
  clip: AnimationTemplate,
  rig: RigDefinition
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (clip.version !== 1) {
    issues.push({
      code: "SCHEMA_VERSION_MISMATCH",
      severity: "error",
      category: "SPEC",
      message: `Unsupported animation template version ${clip.version}. Expected 1.`,
      target: "version"
    });
  }

  if (clip.duration <= 0.0 || !Number.isFinite(clip.duration)) {
    issues.push({
      code: "ANIM_INVALID_DURATION",
      severity: "error",
      category: "ANIMATION",
      message: `Clip duration must be positive finite number, got ${clip.duration}.`,
      target: "duration"
    });
  }

  const boneMap = new Set(rig.bones.map((b) => b.id));
  const slotMap = new Set(rig.slots.map((s) => s.id));

  for (const [boneId, track] of Object.entries(clip.boneTracks)) {
    if (!boneMap.has(boneId)) {
      issues.push({
        code: "ANIM_UNKNOWN_BONE",
        severity: "error",
        category: "ANIMATION",
        message: `Animation references unknown bone '${boneId}'.`,
        target: boneId
      });
    }

    if (track.rotation) {
      for (const kf of track.rotation) {
        if (!Number.isFinite(kf.time) || !Number.isFinite(kf.rotationDelta)) {
          issues.push({
            code: "ANIM_NON_FINITE_VALUE",
            severity: "error",
            category: "ANIMATION",
            message: `Rotation keyframe at time ${kf.time} contains non-finite values.`,
            target: boneId
          });
        }
      }
    }

    if (track.translation) {
      for (const kf of track.translation) {
        if (!Number.isFinite(kf.time) || !Number.isFinite(kf.deltaX) || !Number.isFinite(kf.deltaY)) {
          issues.push({
            code: "ANIM_NON_FINITE_VALUE",
            severity: "error",
            category: "ANIMATION",
            message: `Translation keyframe at time ${kf.time} contains non-finite values.`,
            target: boneId
          });
        }
      }
    }
  }

  if (clip.drawOrderKeys) {
    for (const dok of clip.drawOrderKeys) {
      if (!slotMap.has(dok.slot)) {
        issues.push({
          code: "ANIM_UNKNOWN_SLOT",
          severity: "error",
          category: "ANIMATION",
          message: `Draw order key references unknown slot '${dok.slot}'.`,
          target: dok.slot
        });
      }
      if (!Number.isFinite(dok.time) || !Number.isFinite(dok.drawOrder)) {
        issues.push({
          code: "ANIM_NON_FINITE_VALUE",
          severity: "error",
          category: "ANIMATION",
          message: `Draw order key contains non-finite values at time ${dok.time}.`,
          target: dok.slot
        });
      }
    }
  }

  return issues;
}

export interface ResolvedAnatomy {
  referenceHeight: number;
  boneLengths: Record<string, number>;
  bonePositions: Record<string, [number, number]>;
  ratios: Record<string, number>;
}

/**
 * Resolves character anatomy (bone lengths, positions, and envelope ratios)
 * based on its authored setup and base rig.
 */
export function resolveCharacterAnatomy(
  character: CharacterDefinition,
  baseRig: RigDefinition
): ResolvedAnatomy {
  const H = character.referenceHeight;
  const overrides = character.boneOverrides ?? {};
  const boneMap = new Map(baseRig.bones.map((b) => [b.id, b]));

  const boneLengths: Record<string, number> = {};
  const bonePositions: Record<string, [number, number]> = {};

  for (const bone of baseRig.bones) {
    const o = overrides[bone.id];
    boneLengths[bone.id] = o?.length ?? bone.length;
    bonePositions[bone.id] = [
      bone.x + (o?.x ?? 0),
      bone.y + (o?.y ?? 0)
    ];
  }

  const headLength = boneLengths["head"] ?? 0;
  const torsoLength = boneLengths["torso"] ?? 0;
  const upperArmL = boneLengths["upper_arm_L"] ?? 0;
  const forearmL = boneLengths["forearm_L"] ?? 0;
  const thighL = boneLengths["thigh_L"] ?? 0;
  const shinL = boneLengths["shin_L"] ?? 0;

  const [armLx] = bonePositions["upper_arm_L"] ?? [0, 0];
  const [armRx] = bonePositions["upper_arm_R"] ?? [0, 0];
  const shoulderSpan = Math.abs(armRx - armLx);

  const [thighLx] = bonePositions["thigh_L"] ?? [0, 0];
  const [thighRx] = bonePositions["thigh_R"] ?? [0, 0];
  const hipSpan = Math.abs(thighRx - thighLx);

  const ratios: Record<string, number> = {};
  if (H > 0) {
    ratios["head_to_height"] = headLength / H;
    ratios["torso_to_height"] = torsoLength / H;
    ratios["shoulder_span_to_height"] = shoulderSpan / H;
    ratios["hip_span_to_height"] = hipSpan / H;
    ratios["upper_arm_to_height"] = upperArmL / H;
    if (upperArmL > 0) ratios["forearm_to_upper_arm"] = forearmL / upperArmL;
    ratios["thigh_to_height"] = thighL / H;
    if (thighL > 0) ratios["shin_to_thigh"] = shinL / thighL;
    ratios["total_leg_to_height"] = (thighL + shinL) / H;
  }

  return { referenceHeight: H, boneLengths, bonePositions, ratios };
}

export interface FamilyMatchCandidate {
  rigId: string;
  family: string;
  fits: boolean;
  issues: ValidationIssue[];
}

export interface FamilyMatchResult {
  assignedRig: string;
  assignedFamily: string;
  fitsAssignedEnvelope: boolean;
  issuesForAssigned: ValidationIssue[];
  candidates: Record<string, FamilyMatchCandidate>;
  recommendedFamily: string | null;
}

/**
 * Validates a character against all available Rig Families and determines whether
 * the character conforms to its assigned family envelope and whether boundaries correctly
 * reject mismatched families.
 */
export function validateFamilyAssignment(
  character: CharacterDefinition,
  rigs: Record<string, RigDefinition>,
  envelopes: Record<string, AnatomyEnvelope>
): FamilyMatchResult {
  const candidates: Record<string, FamilyMatchCandidate> = {};
  let recommendedFamily: string | null = null;

  const assignedRig = rigs[character.rig] ?? Object.values(rigs).find((r) => r.id === character.rig);
  const assignedFamily = assignedRig ? assignedRig.family : "unknown";

  const assignedEnvelope = envelopes[character.rig] ?? Object.values(envelopes).find((e) => e.targetRigFamily === assignedFamily);
  const { issues: issuesForAssigned } = assignedRig
    ? validateCharacter(character, assignedRig, assignedEnvelope)
    : { issues: [{ code: "RIG_MISMATCH", severity: "error" as const, category: "SPEC" as const, message: `Unknown assigned rig '${character.rig}'` }] };

  const fitsAssignedEnvelope = issuesForAssigned.filter((i) => i.severity === "error").length === 0;

  if (!assignedRig) {
    return {
      assignedRig: character.rig,
      assignedFamily,
      fitsAssignedEnvelope: false,
      issuesForAssigned,
      candidates,
      recommendedFamily: null
    };
  }

  const anatomy = resolveCharacterAnatomy(character, assignedRig);

  for (const [key, rigDef] of Object.entries(rigs)) {
    const env = envelopes[key] ?? Object.values(envelopes).find((e) => e.targetRigFamily === rigDef.family);
    const issues: ValidationIssue[] = [];

    // 1. Check envelope ratios against resolved anatomy
    if (env) {
      for (const [ratioName, val] of Object.entries(anatomy.ratios)) {
        const range = env.ratios[ratioName];
        if (range && (val < range.min || val > range.max)) {
          issues.push({
            code: "SPEC_OUTSIDE_ENVELOPE",
            severity: "error",
            category: "SPEC",
            message: `Anatomy ratio '${ratioName}' = ${val.toFixed(3)} is outside permitted envelope [${range.min}, ${range.max}] for family '${rigDef.family}'.`,
            target: ratioName
          });
        }
      }
    }

    // 2. Synthesize adaptation overrides from candidate rig to resolved anatomy
    const adaptationOverrides: Record<string, { x?: number; y?: number; length?: number }> = {};
    for (const bone of rigDef.bones) {
      const targetLen = anatomy.boneLengths[bone.id];
      const targetPos = anatomy.bonePositions[bone.id];
      const override: { x?: number; y?: number; length?: number } = {};
      if (targetLen !== undefined && Math.abs(targetLen - bone.length) > 1e-4) {
        override.length = targetLen;
      }
      if (targetPos) {
        const dx = targetPos[0] - bone.x;
        const dy = targetPos[1] - bone.y;
        if (Math.abs(dx) > 1e-4) override.x = dx;
        if (Math.abs(dy) > 1e-4) override.y = dy;
      }
      if (Object.keys(override).length > 0) {
        adaptationOverrides[bone.id] = override;
      }
    }

    const adaptedChar: CharacterDefinition = {
      ...character,
      rig: rigDef.id,
      boneOverrides: adaptationOverrides
    };

    const baseValidation = validateCharacter(adaptedChar, rigDef, undefined);
    for (const issue of baseValidation.issues) {
      if (issue.code === "RIG_OVERRIDE_RATIO_HIGH") {
        issues.push(issue);
      }
    }

    const errors = issues.filter((i) => i.severity === "error");
    const fits = errors.length === 0;

    candidates[rigDef.family] = {
      rigId: rigDef.id,
      family: rigDef.family,
      fits,
      issues
    };

    if (fits && !recommendedFamily) {
      recommendedFamily = rigDef.family;
    }
  }

  return {
    assignedRig: character.rig,
    assignedFamily,
    fitsAssignedEnvelope,
    issuesForAssigned,
    candidates,
    recommendedFamily
  };
}


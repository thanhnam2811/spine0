import type {
  BoneOverride,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

export interface CharacterMetrics {
  override_count: number;
  material_override_count: number;
  material_override_ratio: number;
  mean_length_deviation: number;
  max_length_deviation: number;
  mean_rest_rotation_deviation: number;
  max_rest_rotation_deviation: number;
  // Raw operations counters (for Phase A/B tracking)
  pivot_edits: number;
  anchor_edits: number;
  length_overrides: number;
  rest_rotation_overrides: number;
  position_overrides: number;
  slot_remaps: number;
  part_transform_edits: number;
  validation_iterations: number;
  art_regeneration_count: number;
}

export function computeCharacterMetrics(
  rig: RigDefinition,
  character: CharacterDefinition
): CharacterMetrics {
  const overrides = character.boneOverrides ?? {};
  const boneMap = new Map(rig.bones.map((b) => [b.id, b]));

  let override_count = 0;
  let material_override_count = 0;

  let length_overrides = 0;
  let rest_rotation_overrides = 0;
  let position_overrides = 0;

  let totalLengthDev = 0;
  let maxLengthDev = 0;
  let totalRotDev = 0;
  let maxRotDev = 0;

  const eligibleBones = rig.bones.length;

  for (const bone of rig.bones) {
    const override: BoneOverride | undefined = overrides[bone.id];
    if (!override) continue;

    let hasAnyOverride = false;
    let isMaterial = false;

    // Length check
    if (override.length !== undefined) {
      hasAnyOverride = true;
      length_overrides++;
      const lengthDev = Math.abs(override.length - bone.length);
      totalLengthDev += lengthDev;
      maxLengthDev = Math.max(maxLengthDev, lengthDev);

      if (bone.length > 0 && lengthDev / bone.length > 0.05) {
        isMaterial = true;
      }
    }

    // Rotation check
    if (override.rotation !== undefined) {
      hasAnyOverride = true;
      rest_rotation_overrides++;
      const rotDev = Math.abs(override.rotation);
      totalRotDev += rotDev;
      maxRotDev = Math.max(maxRotDev, rotDev);

      if (rotDev > 3.0) {
        isMaterial = true;
      }
    }

    // Position check
    if (override.x !== undefined || override.y !== undefined) {
      hasAnyOverride = true;
      position_overrides++;
      const dx = override.x ?? 0.0;
      const dy = override.y ?? 0.0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (character.referenceHeight > 0 && dist / character.referenceHeight > 0.02) {
        isMaterial = true;
      }
    }

    if (hasAnyOverride) {
      override_count++;
    }
    if (isMaterial) {
      material_override_count++;
    }
  }

  const material_override_ratio =
    eligibleBones > 0 ? material_override_count / eligibleBones : 0.0;

  const mean_length_deviation =
    eligibleBones > 0 ? totalLengthDev / eligibleBones : 0.0;

  const mean_rest_rotation_deviation =
    eligibleBones > 0 ? totalRotDev / eligibleBones : 0.0;

  return {
    override_count,
    material_override_count,
    material_override_ratio,
    mean_length_deviation,
    max_length_deviation: maxLengthDev,
    mean_rest_rotation_deviation,
    max_rest_rotation_deviation: maxRotDev,
    pivot_edits: 0,
    anchor_edits: 0,
    length_overrides,
    rest_rotation_overrides,
    position_overrides,
    slot_remaps: 0,
    part_transform_edits: 0,
    validation_iterations: 1,
    art_regeneration_count: 0
  };
}

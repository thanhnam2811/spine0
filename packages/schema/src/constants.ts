export const SCHEMA_VERSION = "0.1.0" as const;
export const RIG_FORMAT_VERSION = 1 as const;
export const CHARACTER_FORMAT_VERSION = 1 as const;
export const ANIMATION_FORMAT_VERSION = 1 as const;
export const COMPILED_FORMAT_VERSION = "0.1.0" as const;

export const CANONICAL_BONE_IDS = [
  "root",
  "pelvis",
  "torso",
  "neck",
  "head",
  "upper_arm_L",
  "forearm_L",
  "hand_L",
  "upper_arm_R",
  "forearm_R",
  "hand_R",
  "thigh_L",
  "shin_L",
  "foot_L",
  "thigh_R",
  "shin_R",
  "foot_R"
] as const;

export type CanonicalBoneId = (typeof CANONICAL_BONE_IDS)[number];

export const CANONICAL_SLOT_IDS = [
  "slot_weapon_back",
  "slot_robe_back",
  "slot_arm_far",
  "slot_leg_far",
  "slot_pelvis",
  "slot_leg_near",
  "slot_robe_front",
  "slot_torso",
  "slot_head",
  "slot_arm_near",
  "slot_weapon"
] as const;

export type CanonicalSlotId = (typeof CANONICAL_SLOT_IDS)[number];

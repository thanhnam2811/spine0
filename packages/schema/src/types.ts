import type { CanonicalBoneId, CanonicalSlotId } from "./constants.js";

/* -------------------------------------------------------------------------- */
/*  Rig Definition Types                                                      */
/* -------------------------------------------------------------------------- */

export interface BoneDefinition {
  id: string;
  parent: string | null;
  x: number;
  y: number;
  rotation: number; // degrees, clockwise positive
  length: number;
}

export interface SlotDefinition {
  id: string;
  bone: string;
  defaultDrawOrder: number;
  description?: string;
}

export interface RigDefinition {
  version: number;
  id: string;
  family: string;
  referenceHeight: number;
  bones: BoneDefinition[];
  slots: SlotDefinition[];
}

/* -------------------------------------------------------------------------- */
/*  Character Authoring Types                                                 */
/* -------------------------------------------------------------------------- */

export interface BoneOverride {
  x?: number;
  y?: number;
  rotation?: number; // delta or setup rotation override in degrees
  length?: number;
}

export interface PartDefinition {
  slot: string;
  texture: string;
  width?: number;
  height?: number;
  pivot: [number, number]; // normalized [0..1, 0..1], [0,0]=top-left
  distalAnchor?: [number, number]; // normalized [0..1, 0..1]
}

export interface CharacterDefinition {
  version: number;
  id: string;
  name?: string;
  rig: string; // rig ID reference e.g. "humanoid-normal-v1"
  referenceHeight: number;
  parts: Record<string, PartDefinition>;
  boneOverrides?: Record<string, BoneOverride>;
  setupDrawOrderOverrides?: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  Animation Template Types                                                  */
/* -------------------------------------------------------------------------- */

export type KeyframeCurve = "linear" | "step" | "bezier";

export interface RotationKeyframe {
  time: number; // in seconds >= 0
  rotationDelta: number; // degrees delta relative to resolved setup pose
  curve?: KeyframeCurve;
  bezier?: [number, number, number, number]; // [x1, y1, x2, y2]
}

export type TranslationBasis = "selfBone" | "characterHeight";

export interface TranslationKeyframe {
  time: number; // in seconds >= 0
  deltaX: number; // normalized translation delta
  deltaY: number; // normalized translation delta
  basis: TranslationBasis;
  curve?: KeyframeCurve;
  bezier?: [number, number, number, number];
}

export interface BoneTrack {
  rotation?: RotationKeyframe[];
  translation?: TranslationKeyframe[];
}

export interface DrawOrderKey {
  time: number;
  slot: string;
  drawOrder: number;
}

export interface AnimationTemplate {
  version: number;
  id: string;
  name?: string;
  duration: number; // in seconds > 0
  loop: boolean;
  frameRate?: number;
  boneTracks: Record<string, BoneTrack>;
  drawOrderKeys?: DrawOrderKey[];
}

/* -------------------------------------------------------------------------- */
/*  Anatomy Envelope Types                                                    */
/* -------------------------------------------------------------------------- */

export interface RatioRange {
  min: number;
  nominal: number;
  max: number;
  description?: string;
}

export interface AnatomyEnvelope {
  version: string;
  id: string;
  targetRigFamily: string;
  ratios: Record<string, RatioRange>;
}

/* -------------------------------------------------------------------------- */
/*  Evaluation & Runtime Types                                                */
/* -------------------------------------------------------------------------- */

export interface EvaluatedBonePose {
  id: string;
  localX: number;
  localY: number;
  localRotation: number; // degrees
  worldX: number;
  worldY: number;
  worldRotation: number; // degrees
  length: number;
}

export interface EvaluatedSlotPose {
  slot: string;
  bone: string;
  partKey: string | null;
  texture: string | null;
  pivot: [number, number];
  distalAnchor?: [number, number];
  width: number;
  height: number;
  worldX: number;
  worldY: number;
  worldRotation: number; // degrees
  drawOrder: number;
}

export interface EvaluatedPose {
  time: number;
  clipId: string;
  characterId: string;
  bones: Record<string, EvaluatedBonePose>;
  slots: EvaluatedSlotPose[];
  drawOrder: string[]; // slot IDs sorted by active draw order ascending
}

/* -------------------------------------------------------------------------- */
/*  Compiled Character & Runtime Types                                        */
/* -------------------------------------------------------------------------- */

export interface CompiledBone {
  id: string;
  parentIndex: number; // -1 for root
  restLocalX: number;
  restLocalY: number;
  restLocalRotation: number;
  length: number;
}

export interface CompiledPart {
  key: string;
  slotIndex: number;
  boneIndex: number;
  texture: string;
  width: number;
  height: number;
  pivot: [number, number];
  distalAnchor?: [number, number];
}

export interface CompiledSlot {
  id: string;
  boneIndex: number;
  defaultDrawOrder: number;
}

export interface CompiledClip {
  id: string;
  duration: number;
  loop: boolean;
  boneTracks: Record<string, BoneTrack>;
  drawOrderKeys: DrawOrderKey[];
}

export interface CompiledCharacter {
  formatVersion: string;
  id: string;
  rigId: string;
  referenceHeight: number;
  bones: CompiledBone[];
  slots: CompiledSlot[];
  parts: CompiledPart[];
  clips: Record<string, CompiledClip>;
}

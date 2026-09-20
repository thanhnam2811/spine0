import type {
  BoneDefinition,
  BoneOverride,
  CharacterDefinition,
  RigDefinition,
  SlotDefinition
} from "@animation-factory/schema";
import {
  createTransformMatrix,
  extractRotationDeg,
  multiplyMatrices,
  transformPoint,
  type TransformMatrix
} from "./math.js";

export interface ResolvedBone {
  id: string;
  parent: string | null;
  localX: number;
  localY: number;
  localRotation: number; // degrees
  length: number;
}

export interface ResolvedSkeleton {
  characterId: string;
  rigId: string;
  referenceHeight: number;
  bones: Record<string, ResolvedBone>;
  boneOrder: string[]; // topological order (parents before children)
  slots: SlotDefinition[];
}

/**
 * Computes topological DFS order of bones (root-first).
 */
export function computeTopologicalOrder(bones: BoneDefinition[]): string[] {
  const boneMap = new Map<string, BoneDefinition>();
  const childrenMap = new Map<string, string[]>();

  for (const bone of bones) {
    boneMap.set(bone.id, bone);
    if (!childrenMap.has(bone.id)) {
      childrenMap.set(bone.id, []);
    }
  }

  const roots: string[] = [];
  for (const bone of bones) {
    if (!bone.parent || !boneMap.has(bone.parent)) {
      roots.push(bone.id);
    } else {
      const parentChildren = childrenMap.get(bone.parent);
      if (parentChildren) {
        parentChildren.push(bone.id);
      }
    }
  }

  const order: string[] = [];
  const visited = new Set<string>();

  function traverse(boneId: string) {
    if (visited.has(boneId)) return;
    visited.add(boneId);
    order.push(boneId);

    const children = childrenMap.get(boneId) ?? [];
    for (const childId of children) {
      traverse(childId);
    }
  }

  for (const rootId of roots) {
    traverse(rootId);
  }

  // Guard: if any unvisited bones exist (e.g. disconnected or cycles)
  for (const bone of bones) {
    if (!visited.has(bone.id)) {
      traverse(bone.id);
    }
  }

  return order;
}

/**
 * Resolves character setup pose by merging canonical rig definition with per-character bone overrides.
 */
export function resolveCharacterSetup(
  rig: RigDefinition,
  character: CharacterDefinition
): ResolvedSkeleton {
  const resolvedBones: Record<string, ResolvedBone> = {};
  const overrides = character.boneOverrides ?? {};

  for (const canonical of rig.bones) {
    const override: BoneOverride | undefined = overrides[canonical.id];

    resolvedBones[canonical.id] = {
      id: canonical.id,
      parent: canonical.parent,
      localX: canonical.x + (override?.x ?? 0.0),
      localY: canonical.y + (override?.y ?? 0.0),
      localRotation: canonical.rotation + (override?.rotation ?? 0.0),
      length: override?.length !== undefined ? override.length : canonical.length
    };
  }

  const boneOrder = computeTopologicalOrder(rig.bones);

  const drawOrderOverrides = character.setupDrawOrderOverrides ?? {};
  const resolvedSlots: SlotDefinition[] = rig.slots.map((s) => ({
    ...s,
    defaultDrawOrder:
      drawOrderOverrides[s.id] !== undefined ? drawOrderOverrides[s.id] : s.defaultDrawOrder
  }));

  return {
    characterId: character.id,
    rigId: rig.id,
    referenceHeight: character.referenceHeight,
    bones: resolvedBones,
    boneOrder,
    slots: resolvedSlots
  };
}

export interface SetupBoneWorldTransform {
  boneId: string;
  worldMatrix: TransformMatrix;
  worldX: number;
  worldY: number;
  worldRotation: number;
  distalEndpoint: [number, number];
}

/**
 * Evaluates world affine transforms and distal endpoints for all bones in the setup pose
 * using forward kinematics in topological order.
 */
export function evaluateSetupWorldTransforms(
  rig: RigDefinition,
  character: CharacterDefinition
): Record<string, SetupBoneWorldTransform> {
  const skeleton = resolveCharacterSetup(rig, character);
  const worldMatrices: Record<string, TransformMatrix> = {};
  const result: Record<string, SetupBoneWorldTransform> = {};

  for (const boneId of skeleton.boneOrder) {
    const bone = skeleton.bones[boneId];
    if (!bone) continue;

    const localMatrix = createTransformMatrix(bone.localX, bone.localY, bone.localRotation);
    let worldMatrix: TransformMatrix;

    if (!bone.parent || !worldMatrices[bone.parent]) {
      worldMatrix = localMatrix;
    } else {
      const parentWorld = worldMatrices[bone.parent];
      worldMatrix = multiplyMatrices(parentWorld, localMatrix);
    }

    worldMatrices[boneId] = worldMatrix;
    const worldRotation = extractRotationDeg(worldMatrix);
    const distalEndpoint = transformPoint(worldMatrix, 0, bone.length);

    result[boneId] = {
      boneId,
      worldMatrix,
      worldX: worldMatrix.tx,
      worldY: worldMatrix.ty,
      worldRotation,
      distalEndpoint
    };
  }

  return result;
}

/**
 * Resolves the anatomical bone that a character part is bound to.
 * 1. Explicit partDef.bone (if specified and valid in skeleton)
 * 2. Bone whose ID matches the partKey (e.g. upper_arm_R, forearm_R, thigh_R, head, torso)
 * 3. Fallback to slot.bone (e.g. for weapon, slot_weapon binds to hand_R)
 */
export function resolvePartBone(
  partKey: string,
  partDef: { slot: string; bone?: string },
  skeleton: ResolvedSkeleton
): string {
  if (partDef.bone && skeleton.bones[partDef.bone]) {
    return partDef.bone;
  }
  if (skeleton.bones[partKey]) {
    return partKey;
  }
  const slot = skeleton.slots.find((s) => s.id === partDef.slot);
  if (slot && skeleton.bones[slot.bone]) {
    return slot.bone;
  }
  return "root";
}

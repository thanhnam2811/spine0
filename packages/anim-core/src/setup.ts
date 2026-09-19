import type {
  BoneDefinition,
  BoneOverride,
  CharacterDefinition,
  RigDefinition,
  SlotDefinition
} from "@animation-factory/schema";

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

  return {
    characterId: character.id,
    rigId: rig.id,
    referenceHeight: character.referenceHeight,
    bones: resolvedBones,
    boneOrder,
    slots: rig.slots
  };
}

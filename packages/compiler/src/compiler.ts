import {
  COMPILED_FORMAT_VERSION,
  type AnimationTemplate,
  type CharacterDefinition,
  type CompiledBone,
  type CompiledCharacter,
  type CompiledClip,
  type CompiledPart,
  type CompiledSlot,
  type RigDefinition
} from "@animation-factory/schema";
import { resolveCharacterSetup } from "@animation-factory/anim-core";
import { validateCharacter, validateRig, validateAnimation } from "@animation-factory/validator";

export interface CompileResult {
  success: boolean;
  compiled?: CompiledCharacter;
  errors: string[];
}

export function compileCharacter(
  rig: RigDefinition,
  character: CharacterDefinition,
  clips: AnimationTemplate[]
): CompileResult {
  const errors: string[] = [];

  // 1. Validation phase
  const rigIssues = validateRig(rig);
  for (const issue of rigIssues) {
    if (issue.severity === "error") {
      errors.push(`[${issue.code}] ${issue.message}`);
    }
  }

  const { issues: charIssues } = validateCharacter(character, rig);
  for (const issue of charIssues) {
    if (issue.severity === "error") {
      errors.push(`[${issue.code}] ${issue.message}`);
    }
  }

  for (const clip of clips) {
    const clipIssues = validateAnimation(clip, rig);
    for (const issue of clipIssues) {
      if (issue.severity === "error") {
        errors.push(`[${issue.code}] ${issue.message} (clip '${clip.id}')`);
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // 2. Setup resolution
  const skeleton = resolveCharacterSetup(rig, character);

  // 3. Compile bones in topological order
  const boneIdToIndex = new Map<string, number>();
  skeleton.boneOrder.forEach((id, idx) => boneIdToIndex.set(id, idx));

  const compiledBones: CompiledBone[] = skeleton.boneOrder.map((boneId) => {
    const b = skeleton.bones[boneId];
    const parentIndex = b.parent ? (boneIdToIndex.get(b.parent) ?? -1) : -1;
    return {
      id: b.id,
      parentIndex,
      restLocalX: Number(b.localX.toFixed(4)),
      restLocalY: Number(b.localY.toFixed(4)),
      restLocalRotation: Number(b.localRotation.toFixed(4)),
      length: Number(b.length.toFixed(4))
    };
  });

  // 4. Compile slots
  const slotIdToIndex = new Map<string, number>();
  skeleton.slots.forEach((s, idx) => slotIdToIndex.set(s.id, idx));

  const compiledSlots: CompiledSlot[] = skeleton.slots.map((s) => ({
    id: s.id,
    boneIndex: boneIdToIndex.get(s.bone) ?? 0,
    defaultDrawOrder: s.defaultDrawOrder
  }));

  // 5. Compile parts
  const compiledParts: CompiledPart[] = Object.entries(character.parts)
    .sort(([k1], [k2]) => k1.localeCompare(k2))
    .map(([key, partDef]) => {
      const slotIndex = slotIdToIndex.get(partDef.slot) ?? 0;
      const slot = skeleton.slots[slotIndex];
      const boneIndex = slot ? (boneIdToIndex.get(slot.bone) ?? 0) : 0;

      return {
        key,
        slotIndex,
        boneIndex,
        texture: partDef.texture,
        width: partDef.width ?? 100,
        height: partDef.height ?? 100,
        pivot: [
          Number(partDef.pivot[0].toFixed(4)),
          Number(partDef.pivot[1].toFixed(4))
        ],
        distalAnchor: partDef.distalAnchor
          ? [
              Number(partDef.distalAnchor[0].toFixed(4)),
              Number(partDef.distalAnchor[1].toFixed(4))
            ]
          : undefined
      };
    });

  // 6. Compile clips
  const compiledClips: Record<string, CompiledClip> = {};
  for (const clip of clips) {
    compiledClips[clip.id] = {
      id: clip.id,
      duration: clip.duration,
      loop: clip.loop,
      boneTracks: clip.boneTracks,
      drawOrderKeys: clip.drawOrderKeys ? [...clip.drawOrderKeys].sort((a, b) => a.time - b.time) : []
    };
  }

  const compiled: CompiledCharacter = {
    formatVersion: COMPILED_FORMAT_VERSION,
    id: character.id,
    rigId: rig.id,
    referenceHeight: character.referenceHeight,
    bones: compiledBones,
    slots: compiledSlots,
    parts: compiledParts,
    clips: compiledClips
  };

  return { success: true, compiled, errors: [] };
}

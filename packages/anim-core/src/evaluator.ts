import type {
  AnimationTemplate,
  CharacterDefinition,
  EvaluatedBonePose,
  EvaluatedPartPose,
  EvaluatedPose,
  EvaluatedSlotPose,
  PartDefinition,
  RigDefinition
} from "@animation-factory/schema";
import {
  createTransformMatrix,
  extractRotationDeg,
  multiplyMatrices,
  type TransformMatrix
} from "./math.js";
import { normalizeTime, sampleDrawOrder, sampleRotationTrack, sampleTranslationTrack } from "./sampling.js";
import { resolveCharacterSetup, resolvePartBone, type ResolvedSkeleton } from "./setup.js";

export class PoseEvaluator {
  /**
   * Samples the skeleton pose and slots at a given timeline time.
   */
  public sample(
    rig: RigDefinition,
    character: CharacterDefinition,
    clip: AnimationTemplate,
    time: number
  ): EvaluatedPose {
    const skeleton = resolveCharacterSetup(rig, character);
    return this.sampleResolved(skeleton, character, clip, time);
  }

  /**
   * Evaluates pose from an already-resolved skeleton structure.
   */
  public sampleResolved(
    skeleton: ResolvedSkeleton,
    character: CharacterDefinition,
    clip: AnimationTemplate,
    time: number
  ): EvaluatedPose {
    const t = normalizeTime(time, clip.duration, clip.loop);

    const bonePoses: Record<string, EvaluatedBonePose> = {};
    const worldMatrices: Record<string, TransformMatrix> = {};

    // 1. Forward Kinematics pass in topological order
    for (const boneId of skeleton.boneOrder) {
      const bone = skeleton.bones[boneId];
      if (!bone) continue;

      const track = clip.boneTracks[boneId];

      const rotDelta = sampleRotationTrack(track?.rotation, t);
      const [transX, transY] = sampleTranslationTrack(
        track?.translation,
        t,
        bone.length,
        skeleton.referenceHeight
      );

      const localRotation = bone.localRotation + rotDelta;
      const localX = bone.localX + transX;
      const localY = bone.localY + transY;

      const localMatrix = createTransformMatrix(localX, localY, localRotation);

      let worldMatrix: TransformMatrix;
      if (!bone.parent || !worldMatrices[bone.parent]) {
        worldMatrix = localMatrix;
      } else {
        const parentWorld = worldMatrices[bone.parent];
        worldMatrix = multiplyMatrices(parentWorld, localMatrix);
      }

      worldMatrices[boneId] = worldMatrix;

      bonePoses[boneId] = {
        id: boneId,
        localX,
        localY,
        localRotation,
        worldX: worldMatrix.tx,
        worldY: worldMatrix.ty,
        worldRotation: extractRotationDeg(worldMatrix),
        length: bone.length
      };
    }

    // 2. Dynamic Draw Order evaluation
    const { activeOrders, sortedSlotIds } = sampleDrawOrder(
      skeleton.slots,
      clip.drawOrderKeys,
      t
    );

    // 3. Map character parts to slots (for legacy evaluatedSlots)
    const slotToPartMap = new Map<string, { key: string; def: PartDefinition }>();
    for (const [partKey, partDef] of Object.entries(character.parts)) {
      slotToPartMap.set(partDef.slot, { key: partKey, def: partDef });
    }

    // 4. Construct evaluated slot poses (one per rig slot for backward compatibility)
    const evaluatedSlots: EvaluatedSlotPose[] = [];
    for (const slot of skeleton.slots) {
      const boundBone = bonePoses[slot.bone];
      const partInfo = slotToPartMap.get(slot.id);

      evaluatedSlots.push({
        slot: slot.id,
        bone: slot.bone,
        partKey: partInfo ? partInfo.key : null,
        texture: partInfo ? partInfo.def.texture : null,
        pivot: partInfo ? partInfo.def.pivot : [0.5, 0.5],
        distalAnchor: partInfo?.def.distalAnchor,
        width: partInfo?.def.width ?? 100,
        height: partInfo?.def.height ?? 100,
        worldX: boundBone ? boundBone.worldX : 0.0,
        worldY: boundBone ? boundBone.worldY : 0.0,
        worldRotation: boundBone ? boundBone.worldRotation : 0.0,
        drawOrder: activeOrders[slot.id] ?? slot.defaultDrawOrder
      });
    }
    evaluatedSlots.sort((a, b) => a.drawOrder - b.drawOrder);

    // 5. Construct evaluated part poses for ALL 16 character parts
    // Every part survives simultaneously, driven by its actual anatomical bone transform
    const evaluatedParts: EvaluatedPartPose[] = [];
    for (const [partKey, partDef] of Object.entries(character.parts)) {
      const boundBoneId = resolvePartBone(partKey, partDef, skeleton);
      const boundBone = bonePoses[boundBoneId];
      const slot = skeleton.slots.find((s) => s.id === partDef.slot);
      const slotDrawOrder = slot ? (activeOrders[slot.id] ?? slot.defaultDrawOrder) : 0;

      evaluatedParts.push({
        partKey,
        slot: partDef.slot,
        bone: boundBoneId,
        texture: partDef.texture,
        pivot: partDef.pivot,
        distalAnchor: partDef.distalAnchor,
        width: partDef.width ?? 100,
        height: partDef.height ?? 100,
        worldX: boundBone ? boundBone.worldX : 0.0,
        worldY: boundBone ? boundBone.worldY : 0.0,
        worldRotation: boundBone ? boundBone.worldRotation : 0.0,
        drawOrder: slotDrawOrder
      });
    }
    evaluatedParts.sort((a, b) =>
      a.drawOrder !== b.drawOrder
        ? a.drawOrder - b.drawOrder
        : a.partKey.localeCompare(b.partKey)
    );

    return {
      time: t,
      clipId: clip.id,
      characterId: character.id,
      bones: bonePoses,
      slots: evaluatedSlots,
      parts: evaluatedParts,
      drawOrder: sortedSlotIds
    };
  }
}

export const evaluator = new PoseEvaluator();

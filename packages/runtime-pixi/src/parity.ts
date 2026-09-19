import type {
  CompiledCharacter,
  EvaluatedBonePose,
  EvaluatedPose,
  EvaluatedSlotPose
} from "@animation-factory/schema";
import {
  createTransformMatrix,
  extractRotationDeg,
  multiplyMatrices,
  normalizeTime,
  sampleDrawOrder,
  sampleRotationTrack,
  sampleTranslationTrack,
  type TransformMatrix
} from "@animation-factory/anim-core";

/**
 * Evaluates pose directly from CompiledCharacter runtime data structures.
 * This guarantees runtime parity between authoring evaluator and compiled runtime.
 */
export function sampleCompiledCharacter(
  compiled: CompiledCharacter,
  clipId: string,
  time: number
): EvaluatedPose {
  const clip = compiled.clips[clipId];
  if (!clip) {
    throw new Error(`Clip '${clipId}' not found in compiled character '${compiled.id}'.`);
  }

  const t = normalizeTime(time, clip.duration, clip.loop);

  const bonePoses: Record<string, EvaluatedBonePose> = {};
  const worldMatrices: TransformMatrix[] = new Array(compiled.bones.length);

  // 1. Forward Kinematics pass through indexed bones (topologically ordered)
  for (let i = 0; i < compiled.bones.length; i++) {
    const bone = compiled.bones[i];
    const track = clip.boneTracks[bone.id];

    const rotDelta = sampleRotationTrack(track?.rotation, t);
    const [transX, transY] = sampleTranslationTrack(
      track?.translation,
      t,
      bone.length,
      compiled.referenceHeight
    );

    const localRotation = bone.restLocalRotation + rotDelta;
    const localX = bone.restLocalX + transX;
    const localY = bone.restLocalY + transY;

    const localMatrix = createTransformMatrix(localX, localY, localRotation);

    let worldMatrix: TransformMatrix;
    if (bone.parentIndex < 0) {
      worldMatrix = localMatrix;
    } else {
      const parentWorld = worldMatrices[bone.parentIndex];
      worldMatrix = multiplyMatrices(parentWorld, localMatrix);
    }

    worldMatrices[i] = worldMatrix;

    bonePoses[bone.id] = {
      id: bone.id,
      localX,
      localY,
      localRotation,
      worldX: worldMatrix.tx,
      worldY: worldMatrix.ty,
      worldRotation: extractRotationDeg(worldMatrix),
      length: bone.length
    };
  }

  // 2. Dynamic Draw Order
  const slotsDummy = compiled.slots.map((s) => ({
    id: s.id,
    bone: compiled.bones[s.boneIndex].id,
    defaultDrawOrder: s.defaultDrawOrder
  }));

  const { activeOrders, sortedSlotIds } = sampleDrawOrder(
    slotsDummy,
    clip.drawOrderKeys,
    t
  );

  // 3. Construct evaluated slot poses
  const evaluatedSlots: EvaluatedSlotPose[] = [];
  const partMap = new Map<number, (typeof compiled.parts)[0]>();
  for (const part of compiled.parts) {
    partMap.set(part.slotIndex, part);
  }

  for (let sIdx = 0; sIdx < compiled.slots.length; sIdx++) {
    const slot = compiled.slots[sIdx];
    const boundBone = compiled.bones[slot.boneIndex];
    const bonePose = bonePoses[boundBone.id];
    const part = partMap.get(sIdx);

    evaluatedSlots.push({
      slot: slot.id,
      bone: boundBone.id,
      partKey: part ? part.key : null,
      texture: part ? part.texture : null,
      pivot: part ? part.pivot : [0.5, 0.5],
      distalAnchor: part?.distalAnchor,
      width: part ? part.width : 100,
      height: part ? part.height : 100,
      worldX: bonePose.worldX,
      worldY: bonePose.worldY,
      worldRotation: bonePose.worldRotation,
      drawOrder: activeOrders[slot.id] ?? slot.defaultDrawOrder
    });
  }

  evaluatedSlots.sort((a, b) => a.drawOrder - b.drawOrder);

  return {
    time: t,
    clipId,
    characterId: compiled.id,
    bones: bonePoses,
    slots: evaluatedSlots,
    drawOrder: sortedSlotIds
  };
}

import type {
  BoneOverride
} from "@animation-factory/schema";
import {
  resolveCharacterSetup,
  evaluateSetupWorldTransforms,
  createIdentityMatrix,
  invertMatrix,
  transformPoint,
  radToDeg,
  normalizeAngle
} from "@animation-factory/anim-core";
import type { EditorDocument } from "./document.js";

export interface Command {
  readonly id: string;
  readonly description: string;
  execute(doc: EditorDocument): void;
  undo(doc: EditorDocument): void;
}

/**
 * Updates a bone's bounded setup overrides (x, y, rotation, length).
 * Mutates CHARACTER state only (character.boneOverrides).
 */
export class SetBoneOverrideCommand implements Command {
  public readonly id = "SET_BONE_OVERRIDE";
  public readonly description: string;
  private prevOverride: BoneOverride | undefined;

  constructor(
    public readonly boneId: string,
    public readonly nextOverride: BoneOverride | undefined,
    customDesc?: string
  ) {
    this.description = customDesc ?? `Modify override for bone '${boneId}'`;
  }

  execute(doc: EditorDocument): void {
    if (!doc.character.boneOverrides) {
      doc.character.boneOverrides = {};
    }
    this.prevOverride = doc.character.boneOverrides[this.boneId]
      ? { ...doc.character.boneOverrides[this.boneId] }
      : undefined;

    if (this.nextOverride === undefined) {
      delete doc.character.boneOverrides[this.boneId];
    } else {
      doc.character.boneOverrides[this.boneId] = { ...this.nextOverride };
    }
    doc.notify();
  }

  undo(doc: EditorDocument): void {
    if (!doc.character.boneOverrides) {
      doc.character.boneOverrides = {};
    }
    if (this.prevOverride === undefined) {
      delete doc.character.boneOverrides[this.boneId];
    } else {
      doc.character.boneOverrides[this.boneId] = { ...this.prevOverride };
    }
    doc.notify();
  }
}

/**
 * Repositions distal tip of a bone by updating its rotation and length.
 * Uses exact anim-core forward kinematics world transforms and parent matrix inversion.
 * Mutates CHARACTER state only (character.boneOverrides).
 */
export class SetDistalAnchorCommand implements Command {
  public readonly id = "SET_DISTAL_ANCHOR";
  public readonly description: string;
  private prevOverride: BoneOverride | undefined;

  constructor(
    public readonly boneId: string,
    public readonly worldTarget: { x: number; y: number }
  ) {
    this.description = `Adjust distal anchor for '${boneId}'`;
  }

  execute(doc: EditorDocument): void {
    if (!doc.character.boneOverrides) {
      doc.character.boneOverrides = {};
    }
    this.prevOverride = doc.character.boneOverrides[this.boneId]
      ? { ...doc.character.boneOverrides[this.boneId] }
      : undefined;

    const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
    const worldTransforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    const bone = skeleton.bones[this.boneId];
    const canonical = doc.targetRig.bones.find((b) => b.id === this.boneId);
    if (!bone || !canonical) return;

    // Get parent world matrix (identity if root bone)
    let parentWorldMatrix = createIdentityMatrix();
    if (bone.parent && worldTransforms[bone.parent]) {
      parentWorldMatrix = worldTransforms[bone.parent].worldMatrix;
    }

    // Convert world target point into parent-local space via parent's inverse world matrix
    const parentInvMatrix = invertMatrix(parentWorldMatrix);
    const [targetParentX, targetParentY] = transformPoint(
      parentInvMatrix,
      this.worldTarget.x,
      this.worldTarget.y
    );

    // Delta from bone local origin to target in parent frame
    const dx = targetParentX - bone.localX;
    const dy = targetParentY - bone.localY;
    const targetLength = Math.sqrt(dx * dx + dy * dy);

    // Coordinate system: X+ right, Y+ down, CW positive.
    // Local (0, L) points straight down (+Y).
    // Angle in degrees clockwise from +Y: atan2(-dx, dy)
    const angleFromDown = radToDeg(Math.atan2(-dx, dy));
    const targetLocalRotation = normalizeAngle(angleFromDown);

    const overrideDeltaRot = targetLocalRotation - canonical.rotation;
    const overrideLength = Math.max(10.0, targetLength);

    doc.character.boneOverrides[this.boneId] = {
      ...(doc.character.boneOverrides[this.boneId] ?? {}),
      rotation: overrideDeltaRot,
      length: overrideLength
    };

    doc.notify();
  }

  undo(doc: EditorDocument): void {
    if (!doc.character.boneOverrides) {
      doc.character.boneOverrides = {};
    }
    if (this.prevOverride === undefined) {
      delete doc.character.boneOverrides[this.boneId];
    } else {
      doc.character.boneOverrides[this.boneId] = { ...this.prevOverride };
    }
    doc.notify();
  }
}

/**
 * Rebinds a character's part to a target slot.
 * Mutates CHARACTER state only (character.parts[partKey].slot).
 * RigDefinition remains strictly read-only and immutable.
 */
export class SetPartSlotBindingCommand implements Command {
  public readonly id = "SET_PART_SLOT_BINDING";
  public readonly description: string;
  private prevSlotId: string = "";

  constructor(
    public readonly partKey: string,
    public readonly nextSlotId: string
  ) {
    this.description = `Rebind part '${partKey}' to slot '${nextSlotId}'`;
  }

  execute(doc: EditorDocument): void {
    const part = doc.character.parts[this.partKey];
    if (!part) return;
    this.prevSlotId = part.slot;
    part.slot = this.nextSlotId;
    doc.notify();
  }

  undo(doc: EditorDocument): void {
    const part = doc.character.parts[this.partKey];
    if (!part) return;
    part.slot = this.prevSlotId;
    doc.notify();
  }
}

/**
 * Sets character-specific setup draw order overrides.
 * Mutates CHARACTER state only (character.setupDrawOrderOverrides).
 * RigDefinition remains strictly read-only and immutable.
 */
export class SetSetupDrawOrderCommand implements Command {
  public readonly id = "SET_SETUP_DRAW_ORDER";
  public readonly description: string;
  private prevOverrides: Record<string, number | undefined> = {};

  constructor(
    public readonly nextOrders: Record<string, number>,
    desc?: string
  ) {
    this.description = desc ?? "Update setup draw order override";
  }

  execute(doc: EditorDocument): void {
    if (!doc.character.setupDrawOrderOverrides) {
      doc.character.setupDrawOrderOverrides = {};
    }
    this.prevOverrides = {};
    for (const [slotId, order] of Object.entries(this.nextOrders)) {
      this.prevOverrides[slotId] = doc.character.setupDrawOrderOverrides[slotId];
      doc.character.setupDrawOrderOverrides[slotId] = order;
    }
    doc.notify();
  }

  undo(doc: EditorDocument): void {
    if (!doc.character.setupDrawOrderOverrides) {
      doc.character.setupDrawOrderOverrides = {};
    }
    for (const [slotId, prevOrder] of Object.entries(this.prevOverrides)) {
      if (prevOrder === undefined) {
        delete doc.character.setupDrawOrderOverrides[slotId];
      } else {
        doc.character.setupDrawOrderOverrides[slotId] = prevOrder;
      }
    }
    doc.notify();
  }
}

/**
 * Switches the character's target rig family.
 * Mutates CHARACTER state (character.rig) and EDITOR selection references.
 * RigDefinition and AnatomyEnvelope remain strictly read-only and immutable.
 */
export class ChangeFamilyCommand implements Command {
  public readonly id = "CHANGE_FAMILY";
  public readonly description: string;
  private prevRigId: string;

  constructor(public readonly nextRigId: string) {
    this.description = `Change rig family to '${nextRigId}'`;
    this.prevRigId = "";
  }

  execute(doc: EditorDocument): void {
    this.prevRigId = doc.character.rig;
    doc.character.rig = this.nextRigId;
    if (doc.availableRigs[this.nextRigId]) {
      doc.targetRig = doc.availableRigs[this.nextRigId];
    }
    if (doc.availableEnvelopes[this.nextRigId]) {
      doc.targetEnvelope = doc.availableEnvelopes[this.nextRigId];
    }
    doc.notify();
  }

  undo(doc: EditorDocument): void {
    doc.character.rig = this.prevRigId;
    if (doc.availableRigs[this.prevRigId]) {
      doc.targetRig = doc.availableRigs[this.prevRigId];
    }
    if (doc.availableEnvelopes[this.prevRigId]) {
      doc.targetEnvelope = doc.availableEnvelopes[this.prevRigId];
    }
    doc.notify();
  }
}

import type {
  BoneOverride,
  PartDefinition
} from "@animation-factory/schema";
import { resolveCharacterSetup, degToRad, radToDeg, normalizeAngle } from "@animation-factory/anim-core";
import type { EditorDocument } from "./document.js";

export interface Command {
  readonly id: string;
  readonly description: string;
  execute(doc: EditorDocument): void;
  undo(doc: EditorDocument): void;
}

/**
 * Updates a bone's bounded setup overrides (x, y, rotation, length).
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
    const bone = skeleton.bones[this.boneId];
    const canonical = doc.targetRig.bones.find((b) => b.id === this.boneId);
    if (!bone || !canonical) return;

    // Calculate parent world rotation to convert target delta into local delta
    let parentRotation = 0.0;
    if (bone.parent && skeleton.bones[bone.parent]) {
      let curr: string | null = bone.parent;
      while (curr && skeleton.bones[curr]) {
        parentRotation += skeleton.bones[curr].localRotation;
        curr = skeleton.bones[curr].parent;
      }
    }

    // Bone origin world pos
    let boneOriginX = 0.0;
    let boneOriginY = 0.0;
    let curr: string | null = this.boneId;
    while (curr && skeleton.bones[curr]) {
      boneOriginX += skeleton.bones[curr].localX;
      boneOriginY += skeleton.bones[curr].localY;
      curr = skeleton.bones[curr].parent;
    }

    const dx = this.worldTarget.x - boneOriginX;
    const dy = this.worldTarget.y - boneOriginY;
    const targetLength = Math.sqrt(dx * dx + dy * dy);

    // Local angle from +Y axis (downward screen space):
    // In our coordinate system, local (0, L) points down (+Y)
    // Angle in degrees clockwise from +Y: atan2(-dx, dy)
    const angleFromDown = radToDeg(Math.atan2(-dx, dy));
    const targetLocalRotation = normalizeAngle(angleFromDown - parentRotation);

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
 * Rebinds a slot or part to a different parent bone.
 */
export class SetSlotBoneCommand implements Command {
  public readonly id = "SET_SLOT_BONE";
  public readonly description: string;
  private prevBoneId: string;

  constructor(
    public readonly slotId: string,
    public readonly nextBoneId: string
  ) {
    this.description = `Rebind slot '${slotId}' to bone '${nextBoneId}'`;
    this.prevBoneId = "";
  }

  execute(doc: EditorDocument): void {
    const slot = doc.targetRig.slots.find((s) => s.id === this.slotId);
    if (!slot) return;
    this.prevBoneId = slot.bone;
    slot.bone = this.nextBoneId;
    doc.notify();
  }

  undo(doc: EditorDocument): void {
    const slot = doc.targetRig.slots.find((s) => s.id === this.slotId);
    if (!slot) return;
    slot.bone = this.prevBoneId;
    doc.notify();
  }
}

/**
 * Reorders setup draw orders for slots.
 */
export class SetSetupDrawOrderCommand implements Command {
  public readonly id = "SET_SETUP_DRAW_ORDER";
  public readonly description: string;
  private prevOrders: Record<string, number> = {};

  constructor(
    public readonly nextOrders: Record<string, number>,
    desc?: string
  ) {
    this.description = desc ?? "Update setup draw order";
  }

  execute(doc: EditorDocument): void {
    this.prevOrders = {};
    for (const slot of doc.targetRig.slots) {
      this.prevOrders[slot.id] = slot.defaultDrawOrder;
      if (this.nextOrders[slot.id] !== undefined) {
        slot.defaultDrawOrder = this.nextOrders[slot.id];
      }
    }
    doc.notify();
  }

  undo(doc: EditorDocument): void {
    for (const slot of doc.targetRig.slots) {
      if (this.prevOrders[slot.id] !== undefined) {
        slot.defaultDrawOrder = this.prevOrders[slot.id];
      }
    }
    doc.notify();
  }
}

/**
 * Switches the character's target rig family.
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

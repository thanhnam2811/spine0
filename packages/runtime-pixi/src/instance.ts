import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { EvaluatedPose, EvaluatedSlotPose, RigDefinition } from "@animation-factory/schema";
import { degToRad } from "@animation-factory/anim-core";

export interface RenderOptions {
  showBones?: boolean;
  showAnchors?: boolean;
  flipX?: boolean;
}

export class PixiCharacterInstance {
  public readonly rootContainer: Container;
  public readonly slotsContainer: Container;
  public readonly debugContainer: Container;
  private readonly boneGraphics: Graphics;
  private readonly slotContainers = new Map<string, Container>();
  private readonly partSprites = new Map<string, Sprite>();
  private readonly rig: RigDefinition;

  constructor(rig: RigDefinition, textureResolver?: (path: string) => Texture | null) {
    this.rig = rig;
    this.rootContainer = new Container();
    this.slotsContainer = new Container();
    this.debugContainer = new Container();
    this.boneGraphics = new Graphics();

    this.rootContainer.addChild(this.slotsContainer);
    this.debugContainer.addChild(this.boneGraphics);
    this.rootContainer.addChild(this.debugContainer);

    // Initialize slot containers
    for (const slot of rig.slots) {
      const slotContainer = new Container();
      slotContainer.label = slot.id;
      this.slotContainers.set(slot.id, slotContainer);
      this.slotsContainer.addChild(slotContainer);

      // Create sprite placeholder
      const sprite = new Sprite();
      sprite.label = `sprite_${slot.id}`;
      slotContainer.addChild(sprite);
      this.partSprites.set(slot.id, sprite);
    }
  }

  /**
   * Updates sprite textures from a provided map or resolver.
   */
  public updateTextures(textureMap: Record<string, Texture>): void {
    for (const [slotId, sprite] of this.partSprites.entries()) {
      if (textureMap[slotId]) {
        sprite.texture = textureMap[slotId];
      }
    }
  }

  /**
   * Applies an evaluated pose from anim-core to Pixi DisplayObjects.
   */
  public applyPose(pose: EvaluatedPose, options: RenderOptions = {}): void {
    const { showBones = true, showAnchors = true, flipX = false } = options;

    // 1. Root facing
    this.rootContainer.scale.x = flipX ? -1.0 : 1.0;

    // 2. Position and transform slot sprites
    for (const slotPose of pose.slots) {
      const slotContainer = this.slotContainers.get(slotPose.slot);
      const sprite = this.partSprites.get(slotPose.slot);
      if (!slotContainer || !sprite) continue;

      slotContainer.position.set(slotPose.worldX, slotPose.worldY);
      slotContainer.rotation = degToRad(slotPose.worldRotation);

      sprite.anchor.set(slotPose.pivot[0], slotPose.pivot[1]);
      sprite.width = slotPose.width;
      sprite.height = slotPose.height;
      sprite.visible = slotPose.partKey !== null;
    }

    // 3. Dynamic draw order re-indexing
    // Sort slot containers based on active draw order
    const slotPoseMap = new Map(pose.slots.map((s) => [s.slot, s.drawOrder]));
    this.slotsContainer.children.sort((a, b) => {
      const orderA = slotPoseMap.get(a.label ?? "") ?? 0;
      const orderB = slotPoseMap.get(b.label ?? "") ?? 0;
      return orderA - orderB;
    });

    // 4. Render debug overlay
    this.boneGraphics.clear();

    if (showBones) {
      // Draw skeleton bone links
      for (const canonicalBone of this.rig.bones) {
        if (!canonicalBone.parent) continue;
        const parentPose = pose.bones[canonicalBone.parent];
        const childPose = pose.bones[canonicalBone.id];
        if (!parentPose || !childPose) continue;

        // Bone line
        this.boneGraphics
          .moveTo(parentPose.worldX, parentPose.worldY)
          .lineTo(childPose.worldX, childPose.worldY)
          .stroke({ width: 3, color: 0x00e5ff, alpha: 0.8 });

        // Joint circle
        this.boneGraphics
          .circle(childPose.worldX, childPose.worldY, 4)
          .fill({ color: 0xffea00, alpha: 0.9 });
      }

      // Root marker
      const rootPose = pose.bones["root"];
      if (rootPose) {
        this.boneGraphics
          .circle(rootPose.worldX, rootPose.worldY, 6)
          .fill({ color: 0xff1744, alpha: 1.0 });
      }
    }

    if (showAnchors) {
      // Draw joint pivots (green) and distal anchors (cyan)
      for (const slotPose of pose.slots) {
        if (!slotPose.partKey) continue;

        // Pivot is at (worldX, worldY)
        this.boneGraphics
          .circle(slotPose.worldX, slotPose.worldY, 3)
          .fill({ color: 0x00e676, alpha: 0.9 });

        // If distal anchor exists, compute world position
        if (slotPose.distalAnchor) {
          const dx = (slotPose.distalAnchor[0] - slotPose.pivot[0]) * slotPose.width;
          const dy = (slotPose.distalAnchor[1] - slotPose.pivot[1]) * slotPose.height;
          const rad = degToRad(slotPose.worldRotation);
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const axWorld = slotPose.worldX + (cos * dx - sin * dy);
          const ayWorld = slotPose.worldY + (sin * dx + cos * dy);

          this.boneGraphics
            .circle(axWorld, ayWorld, 3)
            .fill({ color: 0x00b0ff, alpha: 0.9 });
        }
      }
    }
  }

  public destroy(): void {
    this.boneGraphics.destroy();
    this.debugContainer.destroy({ children: true });
    this.slotsContainer.destroy({ children: true });
    this.rootContainer.destroy({ children: true });
    this.slotContainers.clear();
    this.partSprites.clear();
  }
}

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
   * Can be keyed by partKey, texture path, or slotId.
   */
  public updateTextures(textureMap: Record<string, Texture>): void {
    for (const [key, sprite] of this.partSprites.entries()) {
      if (textureMap[key]) {
        sprite.texture = textureMap[key];
      }
    }
  }

  /**
   * Returns sprite for an individual character part.
   */
  public getPartSprite(partKey: string): Sprite | undefined {
    return this.partSprites.get(partKey);
  }

  /**
   * Returns all part sprites.
   */
  public getAllPartSprites(): Map<string, Sprite> {
    return this.partSprites;
  }

  /**
   * Applies an evaluated pose from anim-core to Pixi DisplayObjects.
   * Renders all 16 character parts simultaneously when pose.parts is available,
   * with each part transformed by its own anatomical bone and layered by its slot.
   */
  public applyPose(pose: EvaluatedPose, options: RenderOptions = {}): void {
    const { showBones = true, showAnchors = true, flipX = false } = options;

    // 1. Root facing
    this.rootContainer.scale.x = flipX ? -1.0 : 1.0;

    // 2. Position and transform sprites
    if (pose.parts && pose.parts.length > 0) {
      // Map for sorting slot containers by active draw order
      const slotOrderMap = new Map<string, number>();

      for (const partPose of pose.parts) {
        let slotContainer = this.slotContainers.get(partPose.slot);
        if (!slotContainer) {
          slotContainer = new Container();
          slotContainer.label = partPose.slot;
          this.slotContainers.set(partPose.slot, slotContainer);
          this.slotsContainer.addChild(slotContainer);
        }

        // Slot container sits at origin in root frame; parts hold world transforms
        slotContainer.position.set(0, 0);
        slotContainer.rotation = 0;

        let sprite = this.partSprites.get(partPose.partKey);
        if (!sprite) {
          sprite = new Sprite();
          sprite.label = `sprite_${partPose.partKey}`;
          slotContainer.addChild(sprite);
          this.partSprites.set(partPose.partKey, sprite);
        } else if (sprite.parent !== slotContainer) {
          sprite.parent?.removeChild(sprite);
          slotContainer.addChild(sprite);
        }

        sprite.position.set(partPose.worldX, partPose.worldY);
        sprite.rotation = degToRad(partPose.worldRotation);
        sprite.anchor.set(partPose.pivot[0], partPose.pivot[1]);
        sprite.width = partPose.width;
        sprite.height = partPose.height;
        sprite.visible = true;

        slotOrderMap.set(partPose.slot, partPose.drawOrder);
      }

      // Hide placeholder slot sprites if they aren't bound parts
      for (const [key, sprite] of this.partSprites.entries()) {
        if (!pose.parts.some((p) => p.partKey === key)) {
          sprite.visible = false;
        }
      }

      // 3. Dynamic draw order re-indexing
      this.slotsContainer.children.sort((a, b) => {
        const orderA = slotOrderMap.get(a.label ?? "") ?? 0;
        const orderB = slotOrderMap.get(b.label ?? "") ?? 0;
        return orderA - orderB;
      });
    } else {
      // Legacy fallback for poses containing only slots
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

      const slotPoseMap = new Map(pose.slots.map((s) => [s.slot, s.drawOrder]));
      this.slotsContainer.children.sort((a, b) => {
        const orderA = slotPoseMap.get(a.label ?? "") ?? 0;
        const orderB = slotPoseMap.get(b.label ?? "") ?? 0;
        return orderA - orderB;
      });
    }

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
      // Draw joint pivots (green) and distal anchors (cyan) for all rendered parts
      const activePartPoses = pose.parts && pose.parts.length > 0
        ? pose.parts
        : pose.slots.filter((s) => s.partKey !== null).map((s) => ({
            partKey: s.partKey!,
            worldX: s.worldX,
            worldY: s.worldY,
            worldRotation: s.worldRotation,
            pivot: s.pivot,
            distalAnchor: s.distalAnchor,
            width: s.width,
            height: s.height
          }));

      for (const partPose of activePartPoses) {
        // Pivot is at (worldX, worldY)
        this.boneGraphics
          .circle(partPose.worldX, partPose.worldY, 3)
          .fill({ color: 0x00e676, alpha: 0.9 });

        // If distal anchor exists, compute world position
        if (partPose.distalAnchor) {
          const dx = (partPose.distalAnchor[0] - partPose.pivot[0]) * partPose.width;
          const dy = (partPose.distalAnchor[1] - partPose.pivot[1]) * partPose.height;
          const rad = degToRad(partPose.worldRotation);
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const axWorld = partPose.worldX + (cos * dx - sin * dy);
          const ayWorld = partPose.worldY + (sin * dx + cos * dy);

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

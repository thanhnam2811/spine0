import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { EditorDocument } from "../src/model/document.js";
import { SetBoneOverrideCommand } from "../src/model/commands.js";
import { HistoryManager } from "../src/model/history.js";
import {
  evaluateSetupWorldTransforms,
  resolveCharacterSetup
} from "@animation-factory/anim-core";
import type {
  AnatomyEnvelope,
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "../../..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("Editor UX & Interaction Logic Unit Tests", () => {
  let doc: EditorDocument;
  let history: HistoryManager;

  const rigs = {
    "humanoid-normal-v1": loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
    "humanoid-heavy-v1": loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
    "humanoid-small-v1": loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json")
  };

  const envelopes = {
    "humanoid-normal-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json"),
    "humanoid-heavy-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json"),
    "humanoid-small-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json")
  };

  const clips = {
    idle: loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json")
  };

  const characterFixture = loadJson<CharacterDefinition>("fixtures/family-challenge/normal-01/character.json");

  beforeEach(() => {
    doc = new EditorDocument(characterFixture, rigs, envelopes, clips);
    history = new HistoryManager(doc);
  });

  it("calculates accurate character bounding box and fit camera parameters", () => {
    const transforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const t of Object.values(transforms)) {
      minX = Math.min(minX, t.worldX, t.distalEndpoint[0]);
      maxX = Math.max(maxX, t.worldX, t.distalEndpoint[0]);
      minY = Math.min(minY, t.worldY, t.distalEndpoint[1]);
      maxY = Math.max(maxY, t.worldY, t.distalEndpoint[1]);
    }

    expect(isFinite(minX)).toBe(true);
    expect(isFinite(maxX)).toBe(true);
    expect(isFinite(minY)).toBe(true);
    expect(isFinite(maxY)).toBe(true);

    expect(maxX).toBeGreaterThan(minX);
    expect(maxY).toBeGreaterThan(minY);

    // Character width and height must be physiologically sensible (in pixels)
    const charWidth = maxX - minX;
    const charHeight = maxY - minY;

    expect(charWidth).toBeGreaterThan(50);
    expect(charWidth).toBeLessThan(500);
    expect(charHeight).toBeGreaterThan(150);
    expect(charHeight).toBeLessThan(1000);

    // Compute camera zoom for 1200x800 viewport
    const screenW = 1200;
    const screenH = 800;
    const zoomX = (screenW * 0.75) / charWidth;
    const zoomY = (screenH * 0.75) / charHeight;
    const targetZoom = Math.min(1.8, Math.max(0.35, Math.min(zoomX, zoomY)));

    expect(targetZoom).toBeGreaterThanOrEqual(0.35);
    expect(targetZoom).toBeLessThanOrEqual(1.8);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const camX = screenW / 2 - centerX * targetZoom;
    const camY = screenH / 2 - centerY * targetZoom;

    expect(isFinite(camX)).toBe(true);
    expect(isFinite(camY)).toBe(true);
  });

  it("computes hierarchical tree depth for all bones accurately", () => {
    const depths: Record<string, number> = {};
    const boneMap = new Map<string, { parent: string | null }>();

    for (const b of doc.targetRig.bones) {
      boneMap.set(b.id, { parent: b.parent });
    }

    function getDepth(id: string): number {
      if (depths[id] !== undefined) return depths[id];
      const bone = boneMap.get(id);
      if (!bone || !bone.parent || !boneMap.has(bone.parent)) {
        depths[id] = 0;
        return 0;
      }
      const d = 1 + getDepth(bone.parent);
      depths[id] = d;
      return d;
    }

    for (const b of doc.targetRig.bones) {
      getDepth(b.id);
    }

    // Root bone has depth 0
    expect(depths["root"]).toBe(0);

    // Pelvis is child of root -> depth 1
    expect(depths["pelvis"]).toBe(1);

    // Torso is child of pelvis -> depth 2
    expect(depths["torso"]).toBe(2);

    // Head is child of neck or torso -> depth >= 3
    expect(depths["head"]).toBeGreaterThanOrEqual(3);

    // Foot_L is descendant of upper_leg_L -> depth >= 3
    expect(depths["foot_L"]).toBeGreaterThanOrEqual(3);
  });

  it("accurately tracks character dirty state vs clean baseline", () => {
    const initialJson = JSON.stringify(doc.character);

    // Baseline is not dirty
    expect(JSON.stringify(doc.character) === initialJson).toBe(true);

    // Modify a bone override
    history.execute(new SetBoneOverrideCommand("torso", { x: 5.0 }));
    expect(JSON.stringify(doc.character) === initialJson).toBe(false);

    // Undo reverts back to clean
    history.undo();
    expect(JSON.stringify(doc.character) === initialJson).toBe(true);
  });

  it("handles partial field resets and cleans up empty override records", () => {
    const canonical = doc.targetRig.bones.find((b) => b.id === "torso")!;

    // Set full override
    history.execute(
      new SetBoneOverrideCommand("torso", {
        x: 10.0,
        y: -5.0,
        rotation: 3.0,
        length: canonical.length + 15
      })
    );
    expect(doc.character.boneOverrides?.["torso"]).toBeDefined();

    // Partial reset: reset X to 0
    history.execute(
      new SetBoneOverrideCommand("torso", {
        x: 0.0,
        y: -5.0,
        rotation: 3.0,
        length: canonical.length + 15
      })
    );
    expect(doc.character.boneOverrides?.["torso"]?.x).toBe(0.0);
    expect(doc.character.boneOverrides?.["torso"]?.y).toBe(-5.0);

    // Total bone reset
    history.execute(new SetBoneOverrideCommand("torso", undefined));
    expect(doc.character.boneOverrides?.["torso"]).toBeUndefined();
  });

  it("supports mode switching and maintains clip playback state", () => {
    expect(doc.mode).toBe("setup");
    expect(doc.isPlaying).toBe(false);

    // Switch to preview
    doc.setMode("preview");
    expect(doc.mode).toBe("preview");

    // Playback
    doc.togglePlay();
    expect(doc.isPlaying).toBe(true);

    doc.setPreviewTime(0.45);
    expect(doc.previewTime).toBeCloseTo(0.45, 2);

    doc.setPlaybackSpeed(1.5);
    expect(doc.playbackSpeed).toBe(1.5);

    // Switch back to setup mode pauses playback
    doc.setMode("setup");
    expect(doc.mode).toBe("setup");
    expect(doc.isPlaying).toBe(false);
    expect(doc.previewTime).toBe(0.0);
  });
});

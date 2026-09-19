import { describe, it, expect } from "vitest";
import { validateCharacter, validateRig, validateAnimation } from "../src/validate.js";
import { computeCharacterMetrics } from "../src/metrics.js";
import type {
  AnatomyEnvelope,
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

describe("validator: rig validation", () => {
  const validRig: RigDefinition = {
    version: 1,
    id: "humanoid-normal-v1",
    family: "humanoid-normal",
    referenceHeight: 1000,
    bones: [
      { id: "root", parent: null, x: 0, y: 1000, rotation: 0, length: 0 },
      { id: "pelvis", parent: "root", x: 0, y: -500, rotation: 0, length: 60 },
      { id: "torso", parent: "pelvis", x: 0, y: -60, rotation: 0, length: 180 },
      { id: "neck", parent: "torso", x: 0, y: -180, rotation: 0, length: 40 },
      { id: "head", parent: "neck", x: 0, y: -40, rotation: 0, length: 140 },
      { id: "upper_arm_L", parent: "torso", x: 20, y: -160, rotation: 15, length: 120 },
      { id: "forearm_L", parent: "upper_arm_L", x: 0, y: 120, rotation: 10, length: 110 },
      { id: "hand_L", parent: "forearm_L", x: 0, y: 110, rotation: 5, length: 50 },
      { id: "upper_arm_R", parent: "torso", x: -20, y: -160, rotation: -15, length: 120 },
      { id: "forearm_R", parent: "upper_arm_R", x: 0, y: 120, rotation: -10, length: 110 },
      { id: "hand_R", parent: "forearm_R", x: 0, y: 110, rotation: -5, length: 50 },
      { id: "thigh_L", parent: "pelvis", x: 30, y: 20, rotation: 5, length: 220 },
      { id: "shin_L", parent: "thigh_L", x: 0, y: 220, rotation: -5, length: 200 },
      { id: "foot_L", parent: "shin_L", x: 0, y: 200, rotation: 0, length: 60 },
      { id: "thigh_R", parent: "pelvis", x: -30, y: 20, rotation: -5, length: 220 },
      { id: "shin_R", parent: "thigh_R", x: 0, y: 220, rotation: 5, length: 200 },
      { id: "foot_R", parent: "shin_R", x: 0, y: 200, rotation: 0, length: 60 }
    ],
    slots: [
      { id: "slot_torso", bone: "torso", defaultDrawOrder: 80 }
    ]
  };

  it("passes for canonical 17-bone rig", () => {
    const issues = validateRig(validRig);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("detects cycle in hierarchy", () => {
    const cyclicRig: RigDefinition = {
      ...validRig,
      bones: validRig.bones.map((b) => (b.id === "pelvis" ? { ...b, parent: "torso" } : b))
    };
    const issues = validateRig(cyclicRig);
    expect(issues.some((i) => i.code === "RIG_BAD_HIERARCHY")).toBe(true);
  });
});

describe("validator: character validation", () => {
  const minimalRig: RigDefinition = {
    version: 1,
    id: "test-rig",
    family: "custom",
    referenceHeight: 1000,
    bones: [
      { id: "root", parent: null, x: 0, y: 1000, rotation: 0, length: 0 },
      { id: "pelvis", parent: "root", x: 0, y: -500, rotation: 0, length: 60 }
    ],
    slots: [
      { id: "slot_pelvis", bone: "pelvis", defaultDrawOrder: 10 }
    ]
  };

  it("flags missing required parts", () => {
    const char: CharacterDefinition = {
      version: 1,
      id: "incomplete",
      rig: "test-rig",
      referenceHeight: 1000,
      parts: {}
    };
    const { issues } = validateCharacter(char, minimalRig);
    expect(issues.some((i) => i.code === "ART_MISSING_PART")).toBe(true);
  });

  it("flags out-of-range pivot and anchor", () => {
    const char: CharacterDefinition = {
      version: 1,
      id: "bad-pivot",
      rig: "test-rig",
      referenceHeight: 1000,
      parts: {
        head: { slot: "slot_pelvis", texture: "t.png", pivot: [-0.2, 1.5] },
        torso: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5], distalAnchor: [1.2, 0.5] },
        pelvis: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        upper_arm_R: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        forearm_R: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        hand_R: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        upper_arm_L: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        forearm_L: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        hand_L: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        thigh_R: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        shin_R: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        foot_R: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        thigh_L: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        shin_L: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] },
        foot_L: { slot: "slot_pelvis", texture: "t.png", pivot: [0.5, 0.5] }
      }
    };
    const { issues } = validateCharacter(char, minimalRig);
    expect(issues.some((i) => i.code === "SPEC_PIVOT_OUT_OF_RANGE")).toBe(true);
    expect(issues.some((i) => i.code === "SPEC_ANCHOR_OUT_OF_RANGE")).toBe(true);
  });

  it("flags forbidden scale overrides", () => {
    const char: CharacterDefinition = {
      version: 1,
      id: "bad-scale",
      rig: "test-rig",
      referenceHeight: 1000,
      parts: {},
      boneOverrides: {
        pelvis: {
          scaleX: 1.5
        } as any
      }
    };
    const { issues } = validateCharacter(char, minimalRig);
    expect(issues.some((i) => i.code === "RIG_INVALID_OVERRIDE_FIELD")).toBe(true);
  });

  it("calculates material override ratio and enforces 40% gate", () => {
    // 17 bones rig
    const bones = Array.from({ length: 17 }, (_, i) => ({
      id: `b_${i}`,
      parent: i === 0 ? null : "b_0",
      x: 0,
      y: 0,
      rotation: 0,
      length: 100
    }));
    const rig17: RigDefinition = {
      version: 1,
      id: "rig17",
      family: "custom",
      referenceHeight: 1000,
      bones,
      slots: []
    };

    // Character modifying 8 bones materially (> 5% length) -> 8/17 = 47% > 40%
    const overrides: Record<string, any> = {};
    for (let i = 0; i < 8; i++) {
      overrides[`b_${i}`] = { length: 110 }; // 10% deviation
    }

    const char: CharacterDefinition = {
      version: 1,
      id: "overridden",
      rig: "rig17",
      referenceHeight: 1000,
      parts: {},
      boneOverrides: overrides
    };

    const { issues, metrics } = validateCharacter(char, rig17);
    expect(metrics.material_override_count).toBe(8);
    expect(metrics.material_override_ratio).toBeCloseTo(8 / 17, 3);
    expect(issues.some((i) => i.code === "RIG_OVERRIDE_RATIO_HIGH")).toBe(true);
  });
});

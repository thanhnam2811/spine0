import { describe, it, expect } from "vitest";
import {
  createTransformMatrix,
  degToRad,
  extractRotationDeg,
  lerpAngle,
  multiplyMatrices,
  normalizeAngle,
  shortestAngleDelta,
  transformPoint,
  solveCubicBezier
} from "../src/math.js";
import {
  normalizeTime,
  sampleDrawOrder,
  sampleRotationTrack,
  sampleTranslationTrack
} from "../src/sampling.js";
import { resolveCharacterSetup } from "../src/setup.js";
import { evaluator } from "../src/evaluator.js";
import type {
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

describe("anim-core: math", () => {
  it("verifies positive rotation direction is clockwise (X+ right, Y+ down)", () => {
    // Rotating vector (10, 0) clockwise by 90 degrees in screen coords gives (0, 10)
    const m = createTransformMatrix(0, 0, 90);
    const [x, y] = transformPoint(m, 10, 0);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(10, 5); // +Y is down
  });

  it("verifies shortest path angle interpolation across 359° -> 1°", () => {
    const delta = shortestAngleDelta(359, 1);
    expect(delta).toBe(2); // Shortest path is +2 deg CW, NOT -358 deg CCW

    const halfway = lerpAngle(359, 1, 0.5);
    expect(halfway).toBeCloseTo(0, 5); // exactly at 0/360 degrees
  });

  it("verifies shortest path angle interpolation across 1° -> 359°", () => {
    const delta = shortestAngleDelta(1, 359);
    expect(delta).toBe(-2);

    const halfway = lerpAngle(1, 359, 0.5);
    expect(halfway).toBeCloseTo(0, 5);
  });

  it("verifies nested transforms: parent rotation + child translation", () => {
    // Parent at (100, 100), rotated 90 deg CW
    const parentM = createTransformMatrix(100, 100, 90);
    // Child translated 50 units along local +X
    const childM = createTransformMatrix(50, 0, 0);
    const worldM = multiplyMatrices(parentM, childM);

    // In parent space, +X rotated 90 deg CW points along world +Y
    expect(worldM.tx).toBeCloseTo(100, 5);
    expect(worldM.ty).toBeCloseTo(150, 5);
    expect(extractRotationDeg(worldM)).toBeCloseTo(90, 5);
  });

  it("verifies cubic bezier easing bounds", () => {
    // Ease-in-out curve
    const val0 = solveCubicBezier(0.42, 0.0, 0.58, 1.0, 0.0);
    const valHalf = solveCubicBezier(0.42, 0.0, 0.58, 1.0, 0.5);
    const val1 = solveCubicBezier(0.42, 0.0, 0.58, 1.0, 1.0);

    expect(val0).toBe(0.0);
    expect(valHalf).toBeCloseTo(0.5, 3);
    expect(val1).toBe(1.0);
  });
});

describe("anim-core: sampling & looping", () => {
  it("verifies t = duration loop behavior wraps cleanly", () => {
    const duration = 2.0;
    expect(normalizeTime(0.0, duration, true)).toBe(0.0);
    expect(normalizeTime(1.0, duration, true)).toBe(1.0);
    expect(normalizeTime(2.0, duration, true)).toBe(0.0); // 2.0 % 2.0 = 0.0
    expect(normalizeTime(2.5, duration, true)).toBeCloseTo(0.5, 5);
  });

  it("verifies non-looping clamping at duration", () => {
    const duration = 1.5;
    expect(normalizeTime(2.0, duration, false)).toBe(1.5);
    expect(normalizeTime(-0.5, duration, false)).toBe(0.0);
  });

  it("verifies translation basis selfBone vs characterHeight", () => {
    const kfSelf = [{ time: 0, deltaX: 0.1, deltaY: 0.2, basis: "selfBone" as const }];
    const [px1, py1] = sampleTranslationTrack(kfSelf, 0, 150, 1000);
    expect(px1).toBe(15); // 0.1 * 150
    expect(py1).toBe(30); // 0.2 * 150

    const kfChar = [{ time: 0, deltaX: 0.05, deltaY: 0.1, basis: "characterHeight" as const }];
    const [px2, py2] = sampleTranslationTrack(kfChar, 0, 150, 1000);
    expect(px2).toBe(50); // 0.05 * 1000
    expect(py2).toBe(100); // 0.1 * 1000
  });

  it("verifies dynamic draw order keys updating slots", () => {
    const slots = [
      { id: "slot_torso", bone: "torso", defaultDrawOrder: 50 },
      { id: "slot_weapon", bone: "hand_R", defaultDrawOrder: 110 }
    ];
    const drawOrderKeys = [
      { time: 0.0, slot: "slot_weapon", drawOrder: 15 },
      { time: 0.25, slot: "slot_weapon", drawOrder: 110 },
      { time: 0.55, slot: "slot_weapon", drawOrder: 15 }
    ];

    // at t = 0.1: slot_weapon should be 15 (< torso 50)
    const res0 = sampleDrawOrder(slots, drawOrderKeys, 0.1);
    expect(res0.activeOrders["slot_weapon"]).toBe(15);
    expect(res0.sortedSlotIds).toEqual(["slot_weapon", "slot_torso"]);

    // at t = 0.3: slot_weapon should be 110 (> torso 50)
    const res1 = sampleDrawOrder(slots, drawOrderKeys, 0.3);
    expect(res1.activeOrders["slot_weapon"]).toBe(110);
    expect(res1.sortedSlotIds).toEqual(["slot_torso", "slot_weapon"]);

    // at t = 0.6: slot_weapon returns to 15
    const res2 = sampleDrawOrder(slots, drawOrderKeys, 0.6);
    expect(res2.activeOrders["slot_weapon"]).toBe(15);
    expect(res2.sortedSlotIds).toEqual(["slot_weapon", "slot_torso"]);
  });
});

describe("anim-core: evaluator integration", () => {
  const testRig: RigDefinition = {
    version: 1,
    id: "mini-rig",
    family: "test",
    referenceHeight: 1000,
    bones: [
      { id: "root", parent: null, x: 0, y: 1000, rotation: 0, length: 0 },
      { id: "pelvis", parent: "root", x: 0, y: -500, rotation: 0, length: 50 },
      { id: "thigh", parent: "pelvis", x: 20, y: 50, rotation: 10, length: 200 }
    ],
    slots: [
      { id: "slot_pelvis", bone: "pelvis", defaultDrawOrder: 10 },
      { id: "slot_thigh", bone: "thigh", defaultDrawOrder: 20 }
    ]
  };

  const testChar: CharacterDefinition = {
    version: 1,
    id: "test-char",
    rig: "mini-rig",
    referenceHeight: 1000,
    parts: {
      pelvis: {
        slot: "slot_pelvis",
        texture: "pelvis.png",
        pivot: [0.5, 0.5]
      }
    },
    boneOverrides: {
      pelvis: {
        y: -10, // override pelvis rest y from -500 to -510
        rotation: 5 // override rest rotation by +5 deg
      }
    }
  };

  const testClip: AnimationTemplate = {
    version: 1,
    id: "test-clip",
    duration: 1.0,
    loop: true,
    boneTracks: {
      pelvis: {
        rotation: [
          { time: 0.0, rotationDelta: 0.0 },
          { time: 1.0, rotationDelta: 20.0 }
        ]
      }
    }
  };

  it("verifies zero-length root and setup pose + animation delta composition", () => {
    // At t = 0.5:
    // Pelvis local rotation = resolvedRotation (5) + rotDelta (10) = 15 deg
    // Pelvis world y = root.y (1000) + localY (-510) = 490
    const pose = evaluator.sample(testRig, testChar, testClip, 0.5);

    expect(pose.bones["root"].worldX).toBe(0);
    expect(pose.bones["root"].worldY).toBe(1000);
    expect(pose.bones["root"].worldRotation).toBe(0);

    const pelvisPose = pose.bones["pelvis"];
    expect(pelvisPose.localY).toBe(-510);
    expect(pelvisPose.localRotation).toBeCloseTo(15, 4);
    expect(pelvisPose.worldY).toBeCloseTo(490, 4);
    expect(pelvisPose.worldRotation).toBeCloseTo(15, 4);
  });

  it("handles optional slot absence gracefully (slot_thigh has no assigned part)", () => {
    const pose = evaluator.sample(testRig, testChar, testClip, 0.0);
    const thighSlot = pose.slots.find((s) => s.slot === "slot_thigh");
    expect(thighSlot).toBeDefined();
    expect(thighSlot?.partKey).toBeNull();
    expect(thighSlot?.texture).toBeNull();
  });

  it("verifies multi-part limb: all parts survive simultaneously and bind to anatomical bones", () => {
    const multiRig: RigDefinition = {
      version: 1,
      id: "multi-rig",
      family: "test",
      referenceHeight: 1000,
      bones: [
        { id: "root", parent: null, x: 0, y: 1000, rotation: 0, length: 0 },
        { id: "torso", parent: "root", x: 0, y: -500, rotation: 0, length: 200 },
        { id: "upper_arm_R", parent: "torso", x: 50, y: 0, rotation: 0, length: 100 },
        { id: "forearm_R", parent: "upper_arm_R", x: 0, y: 100, rotation: 0, length: 100 },
        { id: "hand_R", parent: "forearm_R", x: 0, y: 100, rotation: 0, length: 50 }
      ],
      slots: [
        { id: "slot_torso", bone: "torso", defaultDrawOrder: 10 },
        { id: "slot_arm_near", bone: "upper_arm_R", defaultDrawOrder: 20 }
      ]
    };

    const multiChar: CharacterDefinition = {
      version: 1,
      id: "multi-char",
      rig: "multi-rig",
      referenceHeight: 1000,
      parts: {
        torso: { slot: "slot_torso", texture: "torso.png", pivot: [0.5, 0.5] },
        upper_arm_R: { slot: "slot_arm_near", texture: "upper_arm.png", pivot: [0.5, 0.15] },
        forearm_R: { slot: "slot_arm_near", texture: "forearm.png", pivot: [0.5, 0.15] },
        hand_R: { slot: "slot_arm_near", texture: "hand.png", pivot: [0.5, 0.2] }
      }
    };

    const dummyClip: AnimationTemplate = {
      version: 1,
      id: "identity",
      duration: 1.0,
      loop: false,
      boneTracks: {}
    };

    const pose = evaluator.sample(multiRig, multiChar, dummyClip, 0.0);

    // 1. All 4 parts must exist in pose.parts
    expect(pose.parts).toHaveLength(4);
    const partKeys = pose.parts.map((p) => p.partKey);
    expect(partKeys).toContain("torso");
    expect(partKeys).toContain("upper_arm_R");
    expect(partKeys).toContain("forearm_R");
    expect(partKeys).toContain("hand_R");

    // 2. Each limb part must bind to its respective anatomical bone, not collapse to upper_arm_R
    const upperArmPose = pose.parts.find((p) => p.partKey === "upper_arm_R")!;
    const forearmPose = pose.parts.find((p) => p.partKey === "forearm_R")!;
    const handPose = pose.parts.find((p) => p.partKey === "hand_R")!;

    expect(upperArmPose.bone).toBe("upper_arm_R");
    expect(forearmPose.bone).toBe("forearm_R");
    expect(handPose.bone).toBe("hand_R");

    // 3. World positions must be distinct along the kinematic chain
    expect(upperArmPose.worldY).toBe(500); // 1000 - 500
    expect(forearmPose.worldY).toBe(600); // 500 + 100
    expect(handPose.worldY).toBe(700); // 600 + 100

    // 4. All 3 arm parts share the layer slot_arm_near and drawOrder 20
    expect(upperArmPose.slot).toBe("slot_arm_near");
    expect(forearmPose.slot).toBe("slot_arm_near");
    expect(handPose.slot).toBe("slot_arm_near");
    expect(upperArmPose.drawOrder).toBe(20);
    expect(forearmPose.drawOrder).toBe(20);
    expect(handPose.drawOrder).toBe(20);
  });
});


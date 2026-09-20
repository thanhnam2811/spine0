import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { evaluator } from "@animation-factory/anim-core";
import { sampleCompiledCharacter } from "../src/parity.js";
import { compileCharacter } from "@animation-factory/compiler";
import type {
  AnimationTemplate,
  CharacterDefinition,
  EvaluatedPose,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "../../..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("runtime-parity & deterministic pose goldens", () => {
  const rig = loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1.rig.json");
  const idle = loadJson<AnimationTemplate>("assets/animations/idle.anim.json");
  const run = loadJson<AnimationTemplate>("assets/animations/run.anim.json");
  const slash = loadJson<AnimationTemplate>("assets/animations/slash.anim.json");
  const clips = [idle, run, slash];

  const devA = loadJson<CharacterDefinition>("fixtures/calibration/dev-a/character.json");
  const devB = loadJson<CharacterDefinition>("fixtures/calibration/dev-b/character.json");
  const devC = loadJson<CharacterDefinition>("fixtures/calibration/dev-c/character.json");

  const compileResultA = compileCharacter(rig, devA, clips);
  const compiledA = compileResultA.compiled!;

  const testCases = [
    { clip: idle, times: [0.0, 1.0, 1.99] },
    { clip: run, times: [0.0, 0.2, 0.4, 0.6] },
    { clip: slash, times: [0.0, 0.15, 0.25, 0.35, 0.55, 0.75] }
  ];

  it("verifies numerical parity: evaluator pose === compiled runtime pose (tolerance 1e-4)", () => {
    for (const { clip, times } of testCases) {
      for (const t of times) {
        const sourcePose = evaluator.sample(rig, devA, clip, t);
        const compiledPose = sampleCompiledCharacter(compiledA, clip.id, t);

        expect(compiledPose.time).toBeCloseTo(sourcePose.time, 4);
        expect(compiledPose.drawOrder).toEqual(sourcePose.drawOrder);

        // Check all bones
        for (const [boneId, sBone] of Object.entries(sourcePose.bones)) {
          const cBone = compiledPose.bones[boneId];
          expect(cBone).toBeDefined();
          expect(cBone.worldX).toBeCloseTo(sBone.worldX, 4);
          expect(cBone.worldY).toBeCloseTo(sBone.worldY, 4);
          expect(cBone.worldRotation).toBeCloseTo(sBone.worldRotation, 4);
        }

        // Check all slots
        expect(compiledPose.slots.length).toBe(sourcePose.slots.length);
        for (let i = 0; i < sourcePose.slots.length; i++) {
          const sSlot = sourcePose.slots[i];
          const cSlot = compiledPose.slots[i];
          expect(cSlot.slot).toBe(sSlot.slot);
          expect(cSlot.drawOrder).toBe(sSlot.drawOrder);
          expect(cSlot.worldX).toBeCloseTo(sSlot.worldX, 4);
          expect(cSlot.worldY).toBeCloseTo(sSlot.worldY, 4);
          expect(cSlot.worldRotation).toBeCloseTo(sSlot.worldRotation, 4);
        }
      }
    }
  });

  it("generates and verifies deterministic pose goldens for dev-a", () => {
    const goldenDir = path.join(repoRoot, "fixtures/expected/pose");
    fs.mkdirSync(goldenDir, { recursive: true });

    const keyFrames = [
      { clip: idle, t: 0.0, name: "idle_start" },
      { clip: idle, t: 1.0, name: "idle_mid" },
      { clip: run, t: 0.0, name: "run_contact" },
      { clip: run, t: 0.4, name: "run_passing" },
      { clip: slash, t: 0.15, name: "slash_windup" },
      { clip: slash, t: 0.35, name: "slash_impact" },
      { clip: slash, t: 0.65, name: "slash_recovery" }
    ];

    for (const kf of keyFrames) {
      const pose = evaluator.sample(rig, devA, kf.clip, kf.t);

      // Serialize deterministic summary snapshot
      const snapshot = {
        name: kf.name,
        clipId: kf.clip.id,
        time: Number(pose.time.toFixed(4)),
        drawOrder: pose.drawOrder,
        bones: Object.fromEntries(
          Object.entries(pose.bones).map(([id, b]) => [
            id,
            {
              worldX: Number(b.worldX.toFixed(3)),
              worldY: Number(b.worldY.toFixed(3)),
              worldRotation: Number(b.worldRotation.toFixed(3))
            }
          ])
        ),
        weaponDrawOrder: pose.slots.find((s) => s.slot === "slot_weapon")?.drawOrder
      };

      const goldenFile = path.join(goldenDir, `dev-a_${kf.name}.json`);
      if (!fs.existsSync(goldenFile)) {
        fs.writeFileSync(goldenFile, JSON.stringify(snapshot, null, 2), "utf-8");
      }

      const savedSnapshot = JSON.parse(fs.readFileSync(goldenFile, "utf-8"));
      expect(snapshot).toEqual(savedSnapshot);
    }
  });

  it("verifies dynamic draw order in slash: weapon behind -> weapon in front -> weapon behind", () => {
    // Windup t = 0.15: weapon in drawOrder 15 (behind torso)
    const poseWindup = evaluator.sample(rig, devA, slash, 0.15);
    const orderWindup = poseWindup.slots.find((s) => s.slot === "slot_weapon")?.drawOrder;
    expect(orderWindup).toBe(15);
    const torsoOrderWindup = poseWindup.slots.find((s) => s.slot === "slot_torso")?.drawOrder ?? 80;
    expect(orderWindup!).toBeLessThan(torsoOrderWindup);

    // Impact t = 0.35: weapon in drawOrder 110 (in front of torso)
    const poseImpact = evaluator.sample(rig, devA, slash, 0.35);
    const orderImpact = poseImpact.slots.find((s) => s.slot === "slot_weapon")?.drawOrder;
    expect(orderImpact).toBe(110);
    const torsoOrderImpact = poseImpact.slots.find((s) => s.slot === "slot_torso")?.drawOrder ?? 80;
    expect(orderImpact!).toBeGreaterThan(torsoOrderImpact);

    // Recovery t = 0.65: weapon returns to drawOrder 15 (behind torso)
    const poseRecovery = evaluator.sample(rig, devA, slash, 0.65);
    const orderRecovery = poseRecovery.slots.find((s) => s.slot === "slot_weapon")?.drawOrder;
    expect(orderRecovery).toBe(15);
    const torsoOrderRecovery = poseRecovery.slots.find((s) => s.slot === "slot_torso")?.drawOrder ?? 80;
    expect(torsoOrderRecovery!).toBeGreaterThan(orderRecovery!);
  });

  it("verifies numerical parity across all 3 rig families (normal-01, heavy-01, small-01) for idle, run, and slash (tolerance 1e-4)", () => {
    const familyCases = [
      {
        family: "humanoid-normal",
        rig: loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
        char: loadJson<CharacterDefinition>("fixtures/family-challenge/normal-01/character.json"),
        clips: [
          loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json"),
          loadJson<AnimationTemplate>("assets/animations/normal/run.anim.json"),
          loadJson<AnimationTemplate>("assets/animations/normal/slash.anim.json")
        ]
      },
      {
        family: "humanoid-heavy",
        rig: loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
        char: loadJson<CharacterDefinition>("fixtures/family-challenge/heavy-01/character.json"),
        clips: [
          loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json"),
          loadJson<AnimationTemplate>("assets/animations/heavy/run.anim.json"),
          loadJson<AnimationTemplate>("assets/animations/heavy/slash.anim.json")
        ]
      },
      {
        family: "humanoid-small",
        rig: loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json"),
        char: loadJson<CharacterDefinition>("fixtures/family-challenge/small-01/character.json"),
        clips: [
          loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json"),
          loadJson<AnimationTemplate>("assets/animations/small/run.anim.json"),
          loadJson<AnimationTemplate>("assets/animations/small/slash.anim.json")
        ]
      }
    ];

    for (const fc of familyCases) {
      const compileRes = compileCharacter(fc.rig, fc.char, fc.clips);
      expect(compileRes.success).toBe(true);
      const compiled = compileRes.compiled!;

      for (const clip of fc.clips) {
        for (const t of [0.0, 0.2, 0.4, 0.6]) {
          const sourcePose = evaluator.sample(fc.rig, fc.char, clip, t);
          const compiledPose = sampleCompiledCharacter(compiled, clip.id, t);

          expect(compiledPose.time).toBeCloseTo(sourcePose.time, 4);
          expect(compiledPose.drawOrder).toEqual(sourcePose.drawOrder);

          for (const [boneId, sBone] of Object.entries(sourcePose.bones)) {
            const cBone = compiledPose.bones[boneId];
            expect(cBone, `Bone ${boneId} in family ${fc.family} clip ${clip.id}`).toBeDefined();
            expect(cBone.worldX).toBeCloseTo(sBone.worldX, 4);
            expect(cBone.worldY).toBeCloseTo(sBone.worldY, 4);
            expect(cBone.worldRotation).toBeCloseTo(sBone.worldRotation, 4);
          }

          expect(compiledPose.slots.length).toBe(sourcePose.slots.length);
          for (let i = 0; i < sourcePose.slots.length; i++) {
            const sSlot = sourcePose.slots[i];
            const cSlot = compiledPose.slots[i];
            expect(cSlot.slot).toBe(sSlot.slot);
            expect(cSlot.drawOrder).toBe(sSlot.drawOrder);
            expect(cSlot.worldX).toBeCloseTo(sSlot.worldX, 4);
            expect(cSlot.worldY).toBeCloseTo(sSlot.worldY, 4);
            expect(cSlot.worldRotation).toBeCloseTo(sSlot.worldRotation, 4);
          }
        }
      }
    }
  });
});

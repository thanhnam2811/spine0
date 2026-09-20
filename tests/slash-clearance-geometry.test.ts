import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  evaluator,
  computeWeaponSegment,
  checkSegmentCircleClearance
} from "@animation-factory/anim-core";
import type {
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";
import { validateCharacter } from "@animation-factory/validator";

const repoRoot = path.resolve(__dirname, "..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("Slash Clearance Geometry & Proxy Collision Verification", () => {
  const rigs = {
    normal: loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
    heavy: loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
    small: loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json")
  };

  const anims = {
    normalSlash: loadJson<AnimationTemplate>("assets/animations/normal/slash.anim.json"),
    heavySlash: loadJson<AnimationTemplate>("assets/animations/heavy/slash.anim.json"),
    smallSlash: loadJson<AnimationTemplate>("assets/animations/small/slash.anim.json")
  };

  const characters = {
    heavy01: loadJson<CharacterDefinition>("fixtures/family-challenge/heavy-01/character.json"),
    small01: loadJson<CharacterDefinition>("fixtures/family-challenge/small-01/character.json"),
    testC: loadJson<CharacterDefinition>("fixtures/challenge/test-c/character.json"),
    testE: loadJson<CharacterDefinition>("fixtures/challenge/test-e/character.json")
  };

  const sampleTimes = [0.0, 0.15, 0.25, 0.35, 0.55, 0.75];

  it("verifies Heavy slash template maintains complete clearance from bulky pauldron proxy", () => {
    const pauldronRadius = 45.0;
    const weaponLength = 120.0;

    for (const t of sampleTimes) {
      const pose = evaluator.sample(rigs.heavy, characters.heavy01, anims.heavySlash, t);
      const handR = pose.bones["hand_R"];
      const shoulderR = pose.bones["upper_arm_R"];

      const weaponSeg = computeWeaponSegment(handR, weaponLength);
      const pauldronProxy = {
        name: "pauldron_R",
        center: { x: shoulderR.worldX, y: shoulderR.worldY },
        radius: pauldronRadius
      };

      const result = checkSegmentCircleClearance(weaponSeg, pauldronProxy);
      expect(result.hasClearance, `Heavy slash at t=${t} must not intersect pauldron`).toBe(true);
      expect(result.distance).toBeGreaterThan(40.0);
      expect(result.penetration).toBe(0.0);
    }
  });

  it("verifies Small slash template maintains complete clearance from cranial dome proxy", () => {
    const cranialRadius = 70.0;
    const weaponLength = 70.0;

    for (const t of sampleTimes) {
      const pose = evaluator.sample(rigs.small, characters.small01, anims.smallSlash, t);
      const handR = pose.bones["hand_R"];
      const head = pose.bones["head"];

      const weaponSeg = computeWeaponSegment(handR, weaponLength);
      const cranialProxy = {
        name: "cranial_dome",
        center: { x: head.worldX, y: head.worldY },
        radius: cranialRadius
      };

      const result = checkSegmentCircleClearance(weaponSeg, cranialProxy);
      expect(result.hasClearance, `Small slash at t=${t} must not intersect cranial dome`).toBe(true);
      expect(result.distance).toBeGreaterThan(30.0);
      expect(result.penetration).toBe(0.0);
    }
  });

  it("demonstrates why single-rig shared template failed for test-c and test-e in Phase A", () => {
    const normalEnvelope = loadJson<any>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json");
    const heavyEnvelope = loadJson<any>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json");
    const smallEnvelope = loadJson<any>("assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json");

    // In Phase A, test-c (shoulder span) and test-e (head size) violate Normal envelope
    const valC = validateCharacter(characters.testC, rigs.normal, normalEnvelope);
    expect(valC.issues.some((i) => i.code === "SPEC_OUTSIDE_ENVELOPE")).toBe(true);

    const valE = validateCharacter(characters.testE, rigs.normal, normalEnvelope);
    expect(valE.issues.some((i) => i.code === "SPEC_OUTSIDE_ENVELOPE")).toBe(true);

    // In contrast, under the 3-family system, family holdout characters fit their assigned envelope
    const valHeavy01 = validateCharacter(characters.heavy01, rigs.heavy, heavyEnvelope);
    expect(valHeavy01.issues.filter((i) => i.code === "SPEC_OUTSIDE_ENVELOPE")).toHaveLength(0);

    const valSmall01 = validateCharacter(characters.small01, rigs.small, smallEnvelope);
    expect(valSmall01.issues.filter((i) => i.code === "SPEC_OUTSIDE_ENVELOPE")).toHaveLength(0);
  });
});

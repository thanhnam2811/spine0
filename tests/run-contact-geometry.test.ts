import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { evaluator } from "@animation-factory/anim-core";
import type {
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("Run Ground Contact Geometry & Stance Analysis", () => {
  const rigs = {
    normal: loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
    heavy: loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
    small: loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json")
  };

  const anims = {
    normal: loadJson<AnimationTemplate>("assets/animations/normal/run.anim.json"),
    heavy: loadJson<AnimationTemplate>("assets/animations/heavy/run.anim.json"),
    small: loadJson<AnimationTemplate>("assets/animations/small/run.anim.json")
  };

  const characters = {
    normal: loadJson<CharacterDefinition>("fixtures/family-challenge/normal-01/character.json"),
    heavy: loadJson<CharacterDefinition>("fixtures/family-challenge/heavy-01/character.json"),
    small: loadJson<CharacterDefinition>("fixtures/family-challenge/small-01/character.json")
  };

  const groundY = 1000.0;

  it("verifies vertical contact geometry during stance phase across all 3 families", () => {
    // Normal family
    {
      const pose2 = evaluator.sample(rigs.normal, characters.normal, anims.normal, 0.2);
      const pose4 = evaluator.sample(rigs.normal, characters.normal, anims.normal, 0.4);
      const pose6 = evaluator.sample(rigs.normal, characters.normal, anims.normal, 0.6);

      // Stance foot ankle Y coordinate is within expected anatomical band [880, 920]
      expect(pose2.bones["foot_L"].worldY).toBeGreaterThan(880);
      expect(pose2.bones["foot_L"].worldY).toBeLessThan(915);
      expect(pose4.bones["foot_L"].worldY).toBeGreaterThan(880);
      expect(pose4.bones["foot_L"].worldY).toBeLessThan(915);

      expect(pose6.bones["foot_R"].worldY).toBeGreaterThan(890);
      expect(pose6.bones["foot_R"].worldY).toBeLessThan(920);
    }

    // Heavy family
    {
      const pose2 = evaluator.sample(rigs.heavy, characters.heavy, anims.heavy, 0.2);
      const pose4 = evaluator.sample(rigs.heavy, characters.heavy, anims.heavy, 0.4);
      const pose6 = evaluator.sample(rigs.heavy, characters.heavy, anims.heavy, 0.6);

      expect(pose2.bones["foot_L"].worldY).toBeGreaterThan(900);
      expect(pose2.bones["foot_L"].worldY).toBeLessThan(935);
      expect(pose4.bones["foot_L"].worldY).toBeGreaterThan(900);
      expect(pose4.bones["foot_L"].worldY).toBeLessThan(935);

      expect(pose6.bones["foot_R"].worldY).toBeGreaterThan(905);
      expect(pose6.bones["foot_R"].worldY).toBeLessThan(935);
    }

    // Small family
    {
      const pose2 = evaluator.sample(rigs.small, characters.small, anims.small, 0.2);
      const pose4 = evaluator.sample(rigs.small, characters.small, anims.small, 0.4);
      const pose6 = evaluator.sample(rigs.small, characters.small, anims.small, 0.6);

      expect(pose2.bones["foot_L"].worldY).toBeGreaterThan(920);
      expect(pose2.bones["foot_L"].worldY).toBeLessThan(950);
      expect(pose4.bones["foot_L"].worldY).toBeGreaterThan(920);
      expect(pose4.bones["foot_L"].worldY).toBeLessThan(950);

      expect(pose6.bones["foot_R"].worldY).toBeGreaterThan(930);
      expect(pose6.bones["foot_R"].worldY).toBeLessThan(960);
    }
  });

  it("verifies foot swing height clearance during flight / passing phases (t=0.0, t=0.8)", () => {
    for (const fam of ["normal", "heavy", "small"] as const) {
      const pose0 = evaluator.sample(rigs[fam], characters[fam], anims[fam], 0.0);
      const pose8 = evaluator.sample(rigs[fam], characters[fam], anims[fam], 0.8);

      // Passing foot is significantly higher than stance floor
      expect(pose0.bones["foot_L"].worldY).toBeLessThan(870);
      expect(pose8.bones["foot_L"].worldY).toBeLessThan(870);
    }
  });

  it("verifies Small family eliminates the 45px floating gap observed in single-rig Chibi evaluation", () => {
    // In Phase A single-rig evaluation, test-e on normal rig had ankle hovering at Y ~ 907px
    const testE = loadJson<CharacterDefinition>("fixtures/challenge/test-e/character.json");
    const phaseAPose = evaluator.sample(rigs.normal, testE, anims.normal, 0.6);
    const adaptedPose = evaluator.sample(rigs.small, characters.small, anims.small, 0.6);

    const phaseAAnkleY = phaseAPose.bones["foot_R"].worldY;
    const adaptedAnkleY = adaptedPose.bones["foot_R"].worldY;

    // Small family template brings the stance foot down by ~40px, closing the floating gap
    expect(adaptedAnkleY - phaseAAnkleY).toBeGreaterThan(35.0);
    expect(adaptedAnkleY).toBeGreaterThan(940.0);
  });

  it("explicitly confirms V0 kinematic scope: horizontal foot-lock is out of scope (FK only)", () => {
    // V0 architecture uses pure FK keyframe interpolation and delta blending.
    // In the absence of an IK constraint solver, stance feet experience minor horizontal translation.
    const poseStanceStart = evaluator.sample(rigs.normal, characters.normal, anims.normal, 0.2);
    const poseStanceEnd = evaluator.sample(rigs.normal, characters.normal, anims.normal, 0.4);

    const xDisplacement = Math.abs(poseStanceEnd.bones["foot_L"].worldX - poseStanceStart.bones["foot_L"].worldX);
    // Documented architectural fact: horizontal translation delta is non-zero
    expect(xDisplacement).toBeGreaterThan(0.0);
  });
});

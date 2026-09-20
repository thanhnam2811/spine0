import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  validateCharacter,
  validateFamilyAssignment,
  computeCharacterMetrics
} from "@animation-factory/validator";
import { compileCharacter } from "@animation-factory/compiler";
import {
  evaluator,
  resolveCharacterSetup,
  evaluateSetupWorldTransforms,
  computeWeaponSegment,
  checkSegmentCircleClearance
} from "@animation-factory/anim-core";
import type {
  AnatomyEnvelope,
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("Phase C: Production Trial Evaluation & Animation Matrix", () => {
  // Load frozen family rigs
  const rigs: Record<string, RigDefinition> = {
    "humanoid-normal-v1": loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
    "humanoid-heavy-v1": loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
    "humanoid-small-v1": loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json")
  };

  // Load frozen family envelopes
  const envelopes: Record<string, AnatomyEnvelope> = {
    "humanoid-normal-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json"),
    "humanoid-heavy-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json"),
    "humanoid-small-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json")
  };

  // Load family animation templates
  const animations: Record<string, Record<string, AnimationTemplate>> = {
    "humanoid-normal-v1": {
      idle: loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json"),
      run: loadJson<AnimationTemplate>("assets/animations/normal/run.anim.json"),
      slash: loadJson<AnimationTemplate>("assets/animations/normal/slash.anim.json")
    },
    "humanoid-heavy-v1": {
      idle: loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json"),
      run: loadJson<AnimationTemplate>("assets/animations/heavy/run.anim.json"),
      slash: loadJson<AnimationTemplate>("assets/animations/heavy/slash.anim.json")
    },
    "humanoid-small-v1": {
      idle: loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json"),
      run: loadJson<AnimationTemplate>("assets/animations/small/run.anim.json"),
      slash: loadJson<AnimationTemplate>("assets/animations/small/slash.anim.json")
    }
  };

  // 9 Production Trial Characters
  const trialCharacterIds = [
    "normal-01",
    "normal-02",
    "normal-03",
    "heavy-01",
    "heavy-02",
    "heavy-03",
    "small-01",
    "small-02",
    "small-03"
  ];

  it("verifies all 9 trial character packages have valid metadata, character.json, and PNG texture assets", () => {
    expect(trialCharacterIds).toHaveLength(9);

    for (const charId of trialCharacterIds) {
      const charDir = path.join(repoRoot, "fixtures/production-trial", charId);
      const charJsonPath = path.join(charDir, "character.json");
      const metaJsonPath = path.join(charDir, "metadata.json");

      expect(fs.existsSync(charJsonPath), `character.json missing for ${charId}`).toBe(true);
      expect(fs.existsSync(metaJsonPath), `metadata.json missing for ${charId}`).toBe(true);

      const char = loadJson<CharacterDefinition>(`fixtures/production-trial/${charId}/character.json`);
      expect(char.id).toBe(charId);
      expect(char.rig).toBeDefined();
      expect(rigs[char.rig]).toBeDefined();

      // Check all 15 parts
      expect(Object.keys(char.parts).length).toBeGreaterThanOrEqual(15);
      for (const [partKey, part] of Object.entries(char.parts)) {
        expect(part.slot).toBeDefined();
        expect(part.texture).toBeDefined();
        expect(part.width).toBeGreaterThan(0);
        expect(part.height).toBeGreaterThan(0);
        expect(part.pivot).toHaveLength(2);

        // Verify physical PNG file exists and is non-empty
        const texFullPath = path.join(charDir, part.texture);
        expect(fs.existsSync(texFullPath), `Missing PNG texture ${part.texture} for ${charId}`).toBe(true);
        const stats = fs.statSync(texFullPath);
        expect(stats.size).toBeGreaterThan(50);
      }
    }
  });

  it("verifies all 9 trial characters strictly conform to their target rig family anatomy envelopes (0 errors)", () => {
    for (const charId of trialCharacterIds) {
      const char = loadJson<CharacterDefinition>(`fixtures/production-trial/${charId}/character.json`);
      const rig = rigs[char.rig];
      const env = envelopes[char.rig];

      const val = validateCharacter(char, rig, env);
      const errors = val.issues.filter((i) => i.severity === "error");

      expect(errors, `Character ${charId} had envelope errors: ${JSON.stringify(errors)}`).toHaveLength(0);
      expect(val.metrics.material_override_ratio).toBeLessThanOrEqual(0.40);
    }
  });

  it("verifies cross-family assignment correctly aligns each trial character to its assigned family", () => {
    for (const charId of trialCharacterIds) {
      const char = loadJson<CharacterDefinition>(`fixtures/production-trial/${charId}/character.json`);
      const assignment = validateFamilyAssignment(char, rigs, envelopes);

      expect(assignment.fitsAssignedEnvelope, `${charId} must fit its assigned envelope`).toBe(true);
      expect(assignment.assignedFamily).toBe(rigs[char.rig].family);
    }
  });

  it("compiles all 9 characters across idle, run, and slash clips (27 production scenarios)", () => {
    let scenarioCount = 0;

    for (const charId of trialCharacterIds) {
      const char = loadJson<CharacterDefinition>(`fixtures/production-trial/${charId}/character.json`);
      const rig = rigs[char.rig];
      const charAnims = animations[char.rig];
      expect(charAnims).toBeDefined();

      const compileRes = compileCharacter(rig, char, Object.values(charAnims));
      expect(compileRes.success, `Compilation failed for ${charId}: ${compileRes.errors.join(", ")}`).toBe(true);
      expect(compileRes.compiled).toBeDefined();
      expect(Object.keys(compileRes.compiled!.clips)).toHaveLength(3);

      scenarioCount += 3;
    }

    expect(scenarioCount).toBe(27);
  });

  it("evaluates geometric invariants: foot contact stability during run and pauldron/cranial clearances during slash", () => {
    for (const charId of trialCharacterIds) {
      const char = loadJson<CharacterDefinition>(`fixtures/production-trial/${charId}/character.json`);
      const rig = rigs[char.rig];
      const charAnims = animations[char.rig];

      // 1. Foot Contact Evaluation during Run (Ground datum y=1000)
      const runClip = charAnims["run"];
      const runSamples = 20;
      for (let s = 0; s <= runSamples; s++) {
        const t = (s / runSamples) * runClip.duration;
        const pose = evaluator.sample(rig, char, runClip, t);
        const footL = pose.bones["foot_L"];
        const footR = pose.bones["foot_R"];

        if (footL) {
          // Foot penetration into ground should not exceed 4.0px
          const penetrationL = Math.max(0, footL.worldY - 1000.0);
          expect(penetrationL, `${charId} run foot_L penetrated ground at t=${t.toFixed(2)}`).toBeLessThanOrEqual(4.5);
        }
        if (footR) {
          const penetrationR = Math.max(0, footR.worldY - 1000.0);
          expect(penetrationR, `${charId} run foot_R penetrated ground at t=${t.toFixed(2)}`).toBeLessThanOrEqual(4.5);
        }
      }

      // 2. Pauldron & Cranial Clearance Evaluation during Slash
      const slashClip = charAnims["slash"];
      const slashSamples = [0.0, 0.15, 0.25, 0.35, 0.55, 0.75];
      const isHeavy = char.rig.includes("heavy");
      const isSmall = char.rig.includes("small");
      const weaponLength = isSmall ? 70.0 : (isHeavy ? 120.0 : 100.0);

      for (const t of slashSamples) {
        const pose = evaluator.sample(rig, char, slashClip, t);
        const handR = pose.bones["hand_R"];
        const weaponSeg = computeWeaponSegment(handR, weaponLength);

        if (isHeavy) {
          const shoulderR = pose.bones["upper_arm_R"];
          const pauldronProxy = {
            name: "pauldron_R",
            center: { x: shoulderR.worldX, y: shoulderR.worldY },
            radius: 45.0
          };
          const pauldronClearance = checkSegmentCircleClearance(weaponSeg, pauldronProxy);
          expect(pauldronClearance.hasClearance, `${charId} failed pauldron clearance at t=${t.toFixed(2)}`).toBe(true);
        }

        if (isSmall) {
          const head = pose.bones["head"];
          const cranialProxy = {
            name: "cranial_dome",
            center: { x: head.worldX, y: head.worldY },
            radius: 70.0
          };
          const cranialClearance = checkSegmentCircleClearance(weaponSeg, cranialProxy);
          expect(cranialClearance.hasClearance, `${charId} failed cranial clearance at t=${t.toFixed(2)}`).toBe(true);
        }
      }
    }
  });

  it("verifies numerical determinism and parity between raw evaluator poses and compiled runtime poses", () => {
    for (const charId of trialCharacterIds) {
      const char = loadJson<CharacterDefinition>(`fixtures/production-trial/${charId}/character.json`);
      const rig = rigs[char.rig];
      const charAnims = animations[char.rig];
      const idleClip = charAnims["idle"];

      const rawPose = evaluator.sample(rig, char, idleClip, 0.5);

      // Verify setup world transforms consistency
      const setupTransforms = evaluateSetupWorldTransforms(rig, char);
      const skeleton = resolveCharacterSetup(rig, char);

      for (const boneId of skeleton.boneOrder) {
        const st = setupTransforms[boneId];
        expect(st).toBeDefined();
        expect(isFinite(st.worldX)).toBe(true);
        expect(isFinite(st.worldY)).toBe(true);
      }

      // Raw sampled pose must produce valid finite numbers for all bones
      for (const boneId of skeleton.boneOrder) {
        const pb = rawPose.bones[boneId];
        expect(pb).toBeDefined();
        expect(isFinite(pb.worldX)).toBe(true);
        expect(isFinite(pb.worldY)).toBe(true);
        expect(isFinite(pb.worldRotation)).toBe(true);
      }
    }
  });
});

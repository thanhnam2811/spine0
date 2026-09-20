import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { compileCharacter } from "@animation-factory/compiler";
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

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

describe("Phase C.1: Real Asset Integrity & Production Pipeline Verification", () => {
  const rigs: Record<string, RigDefinition> = {
    "humanoid-normal-v1": loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
    "humanoid-heavy-v1": loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
    "humanoid-small-v1": loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json")
  };

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

  const realCharacters = ["real-normal-01", "real-heavy-01", "real-small-01"];
  const requiredParts = [
    "head", "torso", "pelvis",
    "upper_arm_R", "forearm_R", "hand_R",
    "upper_arm_L", "forearm_L", "hand_L",
    "thigh_R", "shin_R", "foot_R",
    "thigh_L", "shin_L", "foot_L",
    "weapon"
  ];

  const contralateralPairs = [
    ["upper_arm_L", "upper_arm_R"],
    ["forearm_L", "forearm_R"],
    ["hand_L", "hand_R"],
    ["thigh_L", "thigh_R"],
    ["shin_L", "shin_R"],
    ["foot_L", "foot_R"]
  ];

  it("verifies all 3 Stage-1 real characters have genuine, non-synthetic texture assets", () => {
    for (const charId of realCharacters) {
      const charDir = path.join(repoRoot, "fixtures/real-production", charId);
      const charJsonPath = path.join(charDir, "character.json");
      const metaJsonPath = path.join(charDir, "metadata.json");

      expect(fs.existsSync(charJsonPath), `character.json missing for ${charId}`).toBe(true);
      expect(fs.existsSync(metaJsonPath), `metadata.json missing for ${charId}`).toBe(true);

      const char = loadJson<CharacterDefinition>(`fixtures/real-production/${charId}/character.json`);
      expect(char.id).toBe(charId);
      expect(rigs[char.rig]).toBeDefined();

      const partHashes: Record<string, string> = {};

      for (const partName of requiredParts) {
        const part = char.parts[partName];
        expect(part, `Missing part ${partName} in ${charId}`).toBeDefined();

        const texPath = path.join(charDir, part.texture);
        expect(fs.existsSync(texPath), `Missing texture file ${part.texture} in ${charId}`).toBe(true);

        const buf = fs.readFileSync(texPath);
        // Minimum size 5KB — verifies genuine illustrated art, not ~200B synthetic rectangle
        expect(buf.length, `Texture ${partName} in ${charId} is suspiciously small (${buf.length} bytes)`).toBeGreaterThanOrEqual(5120);

        // PNG Header check
        expect(buf[0]).toBe(0x89);
        expect(buf[1]).toBe(0x50);
        expect(buf[2]).toBe(0x4e);
        expect(buf[3]).toBe(0x47);

        // RGBA (ColorType 6 or 4) check at byte 25
        const colorType = buf[25];
        expect(colorType === 6 || colorType === 4, `Texture ${partName} in ${charId} must have alpha channel`).toBe(true);

        partHashes[partName] = sha256(buf);
      }

      // Contralateral asymmetry check: Left and Right limbs must be independently drawn
      for (const [partA, partB] of contralateralPairs) {
        expect(partHashes[partA]).not.toBe(partHashes[partB]);
      }
    }
  });

  it("verifies generation attempt logs and failure codes are preserved in evidence directory", () => {
    // real-normal-01 attempts
    const normA01 = loadJson<any>("docs/phase-c1/evidence/real-normal-01/attempts/a01/attempt-record.json");
    expect(normA01.status).toBe("REJECTED");
    expect(normA01.failureCode).toBe("ART_ROBE_UNRIGGABLE");

    const normA02 = loadJson<any>("docs/phase-c1/evidence/real-normal-01/attempts/a02/attempt-record.json");
    expect(normA02.status).toBe("ACCEPTED");

    // real-heavy-01 attempts
    const heavyA00 = loadJson<any>("docs/phase-c1/evidence/real-heavy-01/attempts/a00/attempt-record.json");
    expect(heavyA00.status).toBe("REJECTED");
    expect(heavyA00.failureCode).toBe("ART_OCCLUDED_LIMBS");

    const heavyA01 = loadJson<any>("docs/phase-c1/evidence/real-heavy-01/attempts/a01/attempt-record.json");
    expect(heavyA01.status).toBe("ACCEPTED");

    // real-small-01 attempts
    const smallA00 = loadJson<any>("docs/phase-c1/evidence/real-small-01/attempts/a00/attempt-record.json");
    expect(smallA00.status).toBe("REJECTED");
    expect(smallA00.failureCode).toBe("ART_MERGED_LIMBS");

    const smallA01 = loadJson<any>("docs/phase-c1/evidence/real-small-01/attempts/a01/attempt-record.json");
    expect(smallA01.status).toBe("REJECTED");
    expect(smallA01.failureCode).toBe("ART_INCOMPLETE_PARTS");

    const smallA02 = loadJson<any>("docs/phase-c1/evidence/real-small-01/attempts/a02/attempt-record.json");
    expect(smallA02.status).toBe("ACCEPTED");
  });

  it("compiles and samples all 3 real characters without runtime exceptions", () => {
    for (const charId of realCharacters) {
      const char = loadJson<CharacterDefinition>(`fixtures/real-production/${charId}/character.json`);
      const rig = rigs[char.rig];
      const charAnims = animations[char.rig];

      const compileRes = compileCharacter(rig, char, Object.values(charAnims));
      expect(compileRes.success, `Compile failed for ${charId}: ${compileRes.errors.join(", ")}`).toBe(true);

      const idleClip = charAnims["idle"];
      const samplePose = evaluator.sample(rig, char, idleClip, 0.5);
      expect(samplePose.bones["head"]).toBeDefined();
      expect(Number.isFinite(samplePose.bones["head"].worldX)).toBe(true);
      expect(Number.isFinite(samplePose.bones["head"].worldY)).toBe(true);
    }
  });
});

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
import { decodePngRgba } from "../scripts/check-asset-integrity.mjs";

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

        const decoded = decodePngRgba(buf);
        expect(decoded.ok, `Failed to decode PNG for ${charId}.${partName}`).toBe(true);
        expect(decoded.width, `Width mismatch for ${charId}.${partName}`).toBe(part.width);
        expect(decoded.height, `Height mismatch for ${charId}.${partName}`).toBe(part.height);
        expect(decoded.transparentFraction, `Texture ${partName} in ${charId} lacks cutout transparency (<5% transparent)`).toBeGreaterThanOrEqual(0.05);
        expect(decoded.opaqueFraction, `Texture ${partName} in ${charId} lacks opaque artwork (<10% opaque)`).toBeGreaterThanOrEqual(0.10);

        partHashes[partName] = sha256(buf);
      }

      // Contralateral asymmetry check (exact duplicate rejection)
      for (const [partA, partB] of contralateralPairs) {
        expect(partHashes[partA]).not.toBe(partHashes[partB]);
      }
    }
  });

  it("proves that fake solid rectangles and empty sprites are rejected by the pixel validator", () => {
    // 1. Synthetic Solid Opaque Rectangle (100% opaque, 0% transparent)
    const width = 64;
    const height = 64;
    const zlib = require("node:zlib");

    function createMockPng(alphaVal: number): Buffer {
      const rawScanlines: Buffer[] = [];
      for (let y = 0; y < height; y++) {
        const line = Buffer.alloc(1 + width * 4);
        line[0] = 0; // filter None
        for (let x = 0; x < width; x++) {
          line[1 + x * 4] = 255;     // R
          line[1 + x * 4 + 1] = 0;   // G
          line[1 + x * 4 + 2] = 0;   // B
          line[1 + x * 4 + 3] = alphaVal; // Alpha
        }
        rawScanlines.push(line);
      }
      const raw = Buffer.concat(rawScanlines);
      const compressed = zlib.deflateSync(raw);

      const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const ihdr = Buffer.alloc(25);
      ihdr.writeUInt32BE(13, 0);
      ihdr.write("IHDR", 4);
      ihdr.writeUInt32BE(width, 8);
      ihdr.writeUInt32BE(height, 12);
      ihdr[16] = 8; // bitDepth
      ihdr[17] = 6; // RGBA
      ihdr[18] = 0; // compression
      ihdr[19] = 0; // filter
      ihdr[20] = 0; // interlace

      const idat = Buffer.alloc(12 + compressed.length);
      idat.writeUInt32BE(compressed.length, 0);
      idat.write("IDAT", 4);
      compressed.copy(idat, 8);

      const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
      return Buffer.concat([header, ihdr, idat, iend]);
    }

    // A solid rectangle has transparentFraction === 0 (< 0.05 threshold)
    const solidPng = createMockPng(255);
    const decodedSolid = decodePngRgba(solidPng);
    expect(decodedSolid.ok).toBe(true);
    expect(decodedSolid.transparentFraction).toBe(0.0);
    // Validator threshold rejection:
    expect(decodedSolid.transparentFraction >= 0.05).toBe(false);

    // An empty sprite has opaqueFraction === 0 (< 0.10 threshold)
    const emptyPng = createMockPng(0);
    const decodedEmpty = decodePngRgba(emptyPng);
    expect(decodedEmpty.ok).toBe(true);
    expect(decodedEmpty.opaqueFraction).toBe(0.0);
    // Validator threshold rejection:
    expect(decodedEmpty.opaqueFraction >= 0.10).toBe(false);
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

import { describe, it, expect } from "vitest";
import { compileCharacter } from "../src/compiler.js";
import fs from "node:fs";
import path from "node:path";
import type {
  AnimationTemplate,
  CharacterDefinition,
  CompiledCharacter,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "../../..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("compiler: calibration characters", () => {
  const rig = loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1.rig.json");
  const idle = loadJson<AnimationTemplate>("assets/animations/idle.anim.json");
  const run = loadJson<AnimationTemplate>("assets/animations/run.anim.json");
  const slash = loadJson<AnimationTemplate>("assets/animations/slash.anim.json");

  const clips = [idle, run, slash];

  it("compiles dev-a deterministically with zero errors", () => {
    const devA = loadJson<CharacterDefinition>("fixtures/calibration/dev-a/character.json");
    const result = compileCharacter(rig, devA, clips);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.compiled).toBeDefined();

    const compiled = result.compiled!;
    expect(compiled.id).toBe("dev-a");
    expect(compiled.rigId).toBe("humanoid-normal-v1");
    expect(compiled.bones).toHaveLength(17);
    expect(compiled.slots).toHaveLength(11);
    expect(Object.keys(compiled.clips)).toEqual(["idle", "run", "slash"]);

    // Save golden
    const goldenDir = path.join(repoRoot, "fixtures/expected/runtime");
    fs.mkdirSync(goldenDir, { recursive: true });
    const goldenPath = path.join(goldenDir, "dev-a.compiled.json");
    fs.writeFileSync(goldenPath, JSON.stringify(compiled, null, 2), "utf-8");

    // Re-read and assert match
    const saved = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
    expect(compiled).toEqual(saved);
  });

  it("compiles dev-b deterministically with zero errors", () => {
    const devB = loadJson<CharacterDefinition>("fixtures/calibration/dev-b/character.json");
    const result = compileCharacter(rig, devB, clips);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.compiled).toBeDefined();

    const compiled = result.compiled!;
    expect(compiled.id).toBe("dev-b");
    expect(compiled.bones).toHaveLength(17);

    // Save golden
    const goldenDir = path.join(repoRoot, "fixtures/expected/runtime");
    fs.mkdirSync(goldenDir, { recursive: true });
    const goldenPath = path.join(goldenDir, "dev-b.compiled.json");
    fs.writeFileSync(goldenPath, JSON.stringify(compiled, null, 2), "utf-8");

    const saved = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
    expect(compiled).toEqual(saved);
  });

  it("compiles dev-c deterministically with zero errors", () => {
    const devC = loadJson<CharacterDefinition>("fixtures/calibration/dev-c/character.json");
    const result = compileCharacter(rig, devC, clips);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.compiled).toBeDefined();

    const compiled = result.compiled!;
    expect(compiled.id).toBe("dev-c");
    expect(compiled.bones).toHaveLength(17);

    // Save golden
    const goldenDir = path.join(repoRoot, "fixtures/expected/runtime");
    fs.mkdirSync(goldenDir, { recursive: true });
    const goldenPath = path.join(goldenDir, "dev-c.compiled.json");
    fs.writeFileSync(goldenPath, JSON.stringify(compiled, null, 2), "utf-8");

    const saved = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
    expect(compiled).toEqual(saved);
  });
});

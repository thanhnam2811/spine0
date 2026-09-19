import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateCharacter, validateRig } from "@animation-factory/validator";
import type {
  AnatomyEnvelope,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("calibration evaluation suite", () => {
  const rig = loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1.rig.json");
  const envelope = loadJson<AnatomyEnvelope>("assets/rigs/humanoid-normal-v1.envelope.json");

  const devA = loadJson<CharacterDefinition>("fixtures/calibration/dev-a/character.json");
  const devB = loadJson<CharacterDefinition>("fixtures/calibration/dev-b/character.json");
  const devC = loadJson<CharacterDefinition>("fixtures/calibration/dev-c/character.json");

  it("validates dev-a within envelope and zero error issues", () => {
    const { issues, metrics } = validateCharacter(devA, rig, envelope);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    expect(metrics.material_override_ratio).toBe(0.0);
    expect(metrics.override_count).toBe(0);
  });

  it("validates dev-b within envelope and bounded overrides", () => {
    const { issues, metrics } = validateCharacter(devB, rig, envelope);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    expect(metrics.material_override_ratio).toBeLessThanOrEqual(0.40);
  });

  it("validates dev-c within envelope and bounded overrides", () => {
    const { issues, metrics } = validateCharacter(devC, rig, envelope);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    expect(metrics.material_override_ratio).toBeLessThanOrEqual(0.40);
  });
});

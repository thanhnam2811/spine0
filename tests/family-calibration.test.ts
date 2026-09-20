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

describe("family calibration evaluation suite", () => {
  const rigNormal = loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json");
  const rigHeavy = loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json");
  const rigSmall = loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json");

  const envNormal = loadJson<AnatomyEnvelope>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json");
  const envHeavy = loadJson<AnatomyEnvelope>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json");
  const envSmall = loadJson<AnatomyEnvelope>("assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json");

  const devA = loadJson<CharacterDefinition>("fixtures/family-calibration/dev-a/character.json");
  const devB = loadJson<CharacterDefinition>("fixtures/family-calibration/dev-b/character.json");
  const devC = loadJson<CharacterDefinition>("fixtures/family-calibration/dev-c/character.json");
  const testCCal = loadJson<CharacterDefinition>("fixtures/family-calibration/test-c/character.json");
  const testECal = loadJson<CharacterDefinition>("fixtures/family-calibration/test-e/character.json");

  it("validates dev-a, dev-b, dev-c against humanoid-normal-v1", () => {
    for (const char of [devA, devB, devC]) {
      const { issues, metrics } = validateCharacter(char, rigNormal, envNormal);
      const errors = issues.filter((i) => i.severity === "error");
      expect(errors, `${char.id} has validation errors`).toHaveLength(0);
      expect(metrics.material_override_ratio).toBeLessThanOrEqual(0.40);
    }
  });

  it("validates test-c against humanoid-heavy-v1 with zero material overrides", () => {
    const { issues, metrics } = validateCharacter(testCCal, rigHeavy, envHeavy);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    expect(metrics.material_override_ratio).toBe(0.0);
  });

  it("validates test-e against humanoid-small-v1 with zero material overrides", () => {
    const { issues, metrics } = validateCharacter(testECal, rigSmall, envSmall);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    expect(metrics.material_override_ratio).toBe(0.0);
  });
});

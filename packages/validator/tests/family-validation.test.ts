import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  validateCharacter,
  validateRig,
  validateFamilyAssignment
} from "../src/validate.js";
import type {
  AnatomyEnvelope,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "../../..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("validator: family boundary discrimination", () => {
  const rigNormal = loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json");
  const rigHeavy = loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json");
  const rigSmall = loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json");

  const envNormal = loadJson<AnatomyEnvelope>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json");
  const envHeavy = loadJson<AnatomyEnvelope>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json");
  const envSmall = loadJson<AnatomyEnvelope>("assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json");

  const rigs = {
    "humanoid-normal-v1": rigNormal,
    "humanoid-heavy-v1": rigHeavy,
    "humanoid-small-v1": rigSmall
  };

  const envelopes = {
    "humanoid-normal-v1": envNormal,
    "humanoid-heavy-v1": envHeavy,
    "humanoid-small-v1": envSmall
  };

  it("validates all 3 rig definitions as canonical 17-bone rigs", () => {
    for (const [id, r] of Object.entries(rigs)) {
      const issues = validateRig(r);
      const errors = issues.filter((i) => i.severity === "error");
      expect(errors, `Rig ${id} has errors`).toHaveLength(0);
      expect(r.bones).toHaveLength(17);
      expect(r.slots).toHaveLength(11);
    }
  });

  it("verifies test-c matches Heavy family and is rejected by Normal and Small", () => {
    const testC = loadJson<CharacterDefinition>("fixtures/family-calibration/test-c/character.json");
    const result = validateFamilyAssignment(testC, rigs, envelopes);

    expect(result.assignedFamily).toBe("humanoid-heavy");
    expect(result.fitsAssignedEnvelope).toBe(true);
    expect(result.candidates["humanoid-heavy"].fits).toBe(true);
    expect(result.candidates["humanoid-normal"].fits).toBe(false);
    expect(result.candidates["humanoid-small"].fits).toBe(false);

    // Normal envelope rejects test-c due to wide shoulder span
    const normalIssues = result.candidates["humanoid-normal"].issues;
    expect(normalIssues.some((i) => i.code === "SPEC_OUTSIDE_ENVELOPE" && i.target === "shoulder_span_to_height")).toBe(true);
  });

  it("verifies test-e matches Small family and is rejected by Normal and Heavy", () => {
    const testE = loadJson<CharacterDefinition>("fixtures/family-calibration/test-e/character.json");
    const result = validateFamilyAssignment(testE, rigs, envelopes);

    expect(result.assignedFamily).toBe("humanoid-small");
    expect(result.fitsAssignedEnvelope).toBe(true);
    expect(result.candidates["humanoid-small"].fits).toBe(true);
    expect(result.candidates["humanoid-normal"].fits).toBe(false);
    expect(result.candidates["humanoid-heavy"].fits).toBe(false);

    // Normal envelope rejects test-e due to oversized head and short legs
    const normalIssues = result.candidates["humanoid-normal"].issues;
    expect(normalIssues.some((i) => i.code === "SPEC_OUTSIDE_ENVELOPE" && i.target === "head_to_height")).toBe(true);
  });

  it("verifies dev-a matches Normal family and is rejected by Heavy and Small", () => {
    const devA = loadJson<CharacterDefinition>("fixtures/family-calibration/dev-a/character.json");
    const result = validateFamilyAssignment(devA, rigs, envelopes);

    expect(result.assignedFamily).toBe("humanoid-normal");
    expect(result.fitsAssignedEnvelope).toBe(true);
    expect(result.candidates["humanoid-normal"].fits).toBe(true);
    expect(result.candidates["humanoid-heavy"].fits).toBe(false);
    expect(result.candidates["humanoid-small"].fits).toBe(false);

    // Heavy envelope rejects dev-a because shoulders are too narrow
    const heavyIssues = result.candidates["humanoid-heavy"].issues;
    expect(heavyIssues.some((i) => i.code === "SPEC_OUTSIDE_ENVELOPE" && i.target === "shoulder_span_to_height")).toBe(true);
  });
});

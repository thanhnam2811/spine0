import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  validateCharacter,
  validateRig,
  validateFamilyAssignment,
  computeCharacterMetrics
} from "@animation-factory/validator";
import { evaluator } from "@animation-factory/anim-core";
import { compileCharacter } from "@animation-factory/compiler";
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

interface HoldoutCellResult {
  status: "PASS" | "FAIL";
  failureClass?: string;
  reason?: string;
}

interface HoldoutEvaluationReport {
  id: string;
  name: string;
  assignedFamily: string;
  assignedRig: string;
  fitsAssignedEnvelope: boolean;
  rejectedByOtherFamilies: boolean;
  materialOverrideRatio: number;
  clips: Record<string, HoldoutCellResult>;
}

describe("Phase A.1 Family Holdout Challenge Evaluation", () => {
  const rigs: Record<string, RigDefinition> = {
    "humanoid-normal-v1": loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
    "humanoid-heavy-v1": loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
    "humanoid-small-v1": loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json")
  };

  const envelopes: Record<string, AnatomyEnvelope> = {
    "humanoid-normal-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json"),
    "humanoid-heavy-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json"),
    "humanoid-small-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json")
  };

  const idleShared = loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json");

  const familyClips: Record<string, { run: AnimationTemplate; slash: AnimationTemplate }> = {
    "humanoid-normal": {
      run: loadJson<AnimationTemplate>("assets/animations/normal/run.anim.json"),
      slash: loadJson<AnimationTemplate>("assets/animations/normal/slash.anim.json")
    },
    "humanoid-heavy": {
      run: loadJson<AnimationTemplate>("assets/animations/heavy/run.anim.json"),
      slash: loadJson<AnimationTemplate>("assets/animations/heavy/slash.anim.json")
    },
    "humanoid-small": {
      run: loadJson<AnimationTemplate>("assets/animations/small/run.anim.json"),
      slash: loadJson<AnimationTemplate>("assets/animations/small/slash.anim.json")
    }
  };

  const holdoutIds = [
    "normal-01",
    "normal-02",
    "heavy-01",
    "heavy-02",
    "small-01",
    "small-02"
  ];

  it("evaluates all 6 untouched holdout characters across 3 rig families", () => {
    const reports: HoldoutEvaluationReport[] = [];

    for (const id of holdoutIds) {
      const char = loadJson<CharacterDefinition>(`fixtures/family-challenge/${id}/character.json`);
      const targetRig = rigs[char.rig];
      expect(targetRig, `Rig '${char.rig}' must exist for character ${id}`).toBeDefined();

      const familyResult = validateFamilyAssignment(char, rigs, envelopes);

      // 1. Verify Assigned Envelope Fit
      expect(familyResult.fitsAssignedEnvelope, `${id} must fit assigned envelope`).toBe(true);

      // 2. Verify Cross-Family Rejection (Boundary discrimination)
      const otherFamilies = Object.keys(familyResult.candidates).filter(
        (f) => f !== familyResult.assignedFamily
      );
      for (const otherFam of otherFamilies) {
        expect(
          familyResult.candidates[otherFam].fits,
          `${id} must be rejected by candidate family '${otherFam}'`
        ).toBe(false);
      }

      const metrics = computeCharacterMetrics(targetRig, char);
      expect(metrics.material_override_ratio).toBeLessThanOrEqual(0.40);

      const clipResults: Record<string, HoldoutCellResult> = {};

      // 3. Evaluate Shared Idle
      try {
        const poseIdle0 = evaluator.sample(targetRig, char, idleShared, 0.0);
        const poseIdle1 = evaluator.sample(targetRig, char, idleShared, 1.0);
        expect(Object.keys(poseIdle0.bones)).toHaveLength(17);
        expect(Object.keys(poseIdle1.bones)).toHaveLength(17);
        clipResults["idle"] = { status: "PASS" };
      } catch (err: any) {
        clipResults["idle"] = { status: "FAIL", failureClass: "RUNTIME", reason: err.message };
      }

      // 4. Evaluate Family Run
      const clips = familyClips[targetRig.family];
      try {
        const poseRun0 = evaluator.sample(targetRig, char, clips.run, 0.2);
        const poseRun1 = evaluator.sample(targetRig, char, clips.run, 0.6);
        expect(Object.keys(poseRun0.bones)).toHaveLength(17);
        expect(Object.keys(poseRun1.bones)).toHaveLength(17);
        clipResults["run"] = { status: "PASS" };
      } catch (err: any) {
        clipResults["run"] = { status: "FAIL", failureClass: "RUNTIME", reason: err.message };
      }

      // 5. Evaluate Family Slash & Dynamic Draw Order
      try {
        const poseWindup = evaluator.sample(targetRig, char, clips.slash, 0.15);
        const poseImpact = evaluator.sample(targetRig, char, clips.slash, 0.35);
        const poseRecovery = evaluator.sample(targetRig, char, clips.slash, 0.65);

        const w0 = poseWindup.slots.find((s) => s.slot === "slot_weapon")?.drawOrder;
        const w1 = poseImpact.slots.find((s) => s.slot === "slot_weapon")?.drawOrder;
        const w2 = poseRecovery.slots.find((s) => s.slot === "slot_weapon")?.drawOrder;

        if (w0 !== 15 || w1 !== 110 || w2 !== 15) {
          clipResults["slash"] = {
            status: "FAIL",
            failureClass: "ANIMATION",
            reason: `Dynamic draw order keying failed: expected [15, 110, 15], got [${w0}, ${w1}, ${w2}]`
          };
        } else {
          clipResults["slash"] = { status: "PASS" };
        }
      } catch (err: any) {
        clipResults["slash"] = { status: "FAIL", failureClass: "RUNTIME", reason: err.message };
      }

      // 6. Test deterministic compiler integration
      const compileResult = compileCharacter(targetRig, char, [idleShared, clips.run, clips.slash]);
      expect(compileResult.success, `Character ${id} must compile successfully`).toBe(true);
      const compiled = compileResult.compiled!;
      expect(compiled.bones).toHaveLength(17);
      expect(compiled.slots).toHaveLength(11);
      expect(compiled.clips["idle"]).toBeDefined();

      reports.push({
        id: char.id,
        name: char.name ?? char.id,
        assignedFamily: familyResult.assignedFamily,
        assignedRig: char.rig,
        fitsAssignedEnvelope: familyResult.fitsAssignedEnvelope,
        rejectedByOtherFamilies: otherFamilies.every((f) => !familyResult.candidates[f].fits),
        materialOverrideRatio: metrics.material_override_ratio,
        clips: clipResults
      });
    }

    // Save evaluation data
    fs.writeFileSync(
      path.join(repoRoot, "docs/spike-results/phase-a1-evaluation-data.json"),
      JSON.stringify(reports, null, 2),
      "utf-8"
    );

    expect(reports).toHaveLength(6);
    expect(reports.every((r) => r.fitsAssignedEnvelope)).toBe(true);
    expect(reports.every((r) => r.rejectedByOtherFamilies)).toBe(true);
    expect(reports.every((r) => r.clips["idle"].status === "PASS")).toBe(true);
    expect(reports.every((r) => r.clips["run"].status === "PASS")).toBe(true);
    expect(reports.every((r) => r.clips["slash"].status === "PASS")).toBe(true);
  });
});

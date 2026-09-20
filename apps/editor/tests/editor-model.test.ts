import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { EditorDocument } from "../src/model/document.js";
import {
  SetBoneOverrideCommand,
  SetDistalAnchorCommand,
  SetSlotBoneCommand,
  SetSetupDrawOrderCommand,
  ChangeFamilyCommand
} from "../src/model/commands.js";
import { HistoryManager } from "../src/model/history.js";
import { SessionMetricsTracker } from "../src/model/metrics.js";
import type {
  AnatomyEnvelope,
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

const repoRoot = path.resolve(__dirname, "../../..");

function loadJson<T>(relPath: string): T {
  const fullPath = path.join(repoRoot, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("Editor Document & Command History Unit Tests", () => {
  let doc: EditorDocument;
  let history: HistoryManager;

  const rigs = {
    "humanoid-normal-v1": loadJson<RigDefinition>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"),
    "humanoid-heavy-v1": loadJson<RigDefinition>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"),
    "humanoid-small-v1": loadJson<RigDefinition>("assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json")
  };

  const envelopes = {
    "humanoid-normal-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json"),
    "humanoid-heavy-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json"),
    "humanoid-small-v1": loadJson<AnatomyEnvelope>("assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json")
  };

  const clips = {
    idle: loadJson<AnimationTemplate>("assets/animations/shared/idle.anim.json"),
    run: loadJson<AnimationTemplate>("assets/animations/normal/run.anim.json"),
    slash: loadJson<AnimationTemplate>("assets/animations/normal/slash.anim.json")
  };

  const characterFixture = loadJson<CharacterDefinition>("fixtures/family-challenge/normal-01/character.json");

  beforeEach(() => {
    doc = new EditorDocument(characterFixture, rigs, envelopes, clips);
    history = new HistoryManager(doc);
  });

  it("applies, validates, and undoes SetBoneOverrideCommand", () => {
    expect(doc.character.boneOverrides?.["torso"]).toBeUndefined();

    const cmd = new SetBoneOverrideCommand("torso", { x: 5.0, y: -10.0, rotation: 2.0, length: 185.0 });
    history.execute(cmd);

    expect(doc.character.boneOverrides?.["torso"]).toEqual({
      x: 5.0,
      y: -10.0,
      rotation: 2.0,
      length: 185.0
    });
    expect(history.canUndo()).toBe(true);

    // Undo
    history.undo();
    expect(doc.character.boneOverrides?.["torso"]).toBeUndefined();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    // Redo
    history.redo();
    expect(doc.character.boneOverrides?.["torso"]?.length).toBe(185.0);
  });

  it("coalesces continuous drag updates into exactly ONE undo history entry", () => {
    history.beginTransaction("Drag upper_arm_L pivot");

    // Simulate 15 continuous pointermove drag events
    for (let i = 1; i <= 15; i++) {
      const stepCmd = new SetBoneOverrideCommand("upper_arm_L", {
        x: i * 2.0,
        y: i * 1.5,
        rotation: i * 0.5,
        length: 120.0 + i
      });
      history.execute(stepCmd);
    }

    // Document state reflects final drag position
    expect(doc.character.boneOverrides?.["upper_arm_L"]?.x).toBe(30.0);
    expect(doc.character.boneOverrides?.["upper_arm_L"]?.length).toBe(135.0);

    // Pointer up commits transaction
    history.commitTransaction();

    // Critical assertion: history contains exactly ONE entry, not 15!
    expect(history.getUndoDescriptions()).toHaveLength(1);
    expect(history.getUndoDescriptions()[0]).toBe("Drag upper_arm_L pivot");

    // Single undo must completely revert to original state
    history.undo();
    expect(doc.character.boneOverrides?.["upper_arm_L"]).toBeUndefined();

    // Single redo must restore final dragged state
    history.redo();
    expect(doc.character.boneOverrides?.["upper_arm_L"]?.x).toBe(30.0);
  });

  it("aborts active transaction on cancelTransaction() without polluting undo stack", () => {
    history.beginTransaction("Cancelled drag");
    history.execute(new SetBoneOverrideCommand("head", { x: 10.0, y: 10.0 }));

    expect(doc.character.boneOverrides?.["head"]?.x).toBe(10.0);

    history.cancelTransaction();

    // Reverts to start state
    expect(doc.character.boneOverrides?.["head"]).toBeUndefined();
    expect(history.canUndo()).toBe(false);
  });

  it("executes and undoes ChangeFamilyCommand", () => {
    expect(doc.character.rig).toBe("humanoid-normal-v1");
    expect(doc.targetRig.id).toBe("humanoid-normal-v1");

    history.execute(new ChangeFamilyCommand("humanoid-heavy-v1"));

    expect(doc.character.rig).toBe("humanoid-heavy-v1");
    expect(doc.targetRig.id).toBe("humanoid-heavy-v1");
    expect(doc.targetEnvelope.targetRigFamily).toBe("humanoid-heavy");

    history.undo();
    expect(doc.character.rig).toBe("humanoid-normal-v1");
    expect(doc.targetRig.id).toBe("humanoid-normal-v1");
  });

  it("tracks session metrics and time to compliance", () => {
    const tracker = new SessionMetricsTracker(2);
    tracker.recordAdjustment();
    tracker.recordAdjustment();
    tracker.recordUndo();
    tracker.recordRedo();

    tracker.updateIssueCount(0);
    const summary = tracker.getSummary();

    expect(summary.totalAdjustments).toBe(2);
    expect(summary.totalUndos).toBe(1);
    expect(summary.totalRedos).toBe(1);
    expect(summary.isCompliant).toBe(true);
    expect(summary.timeToComplianceSeconds).not.toBeNull();
  });
});

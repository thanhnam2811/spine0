import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { EditorDocument, deepFreeze } from "../src/model/document.js";
import {
  SetBoneOverrideCommand,
  SetDistalAnchorCommand,
  SetPartPivotCommand,
  SetPartDistalAnchorCommand,
  SetPartSlotBindingCommand,
  SetSetupDrawOrderCommand,
  ChangeFamilyCommand
} from "../src/model/commands.js";
import { HistoryManager } from "../src/model/history.js";
import { SessionMetricsTracker } from "../src/model/metrics.js";
import {
  resolveCharacterSetup,
  evaluateSetupWorldTransforms
} from "@animation-factory/anim-core";
import { compileCharacter } from "@animation-factory/compiler";
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

  it("executes and undoes ChangeFamilyCommand without mutating canonical family definitions", () => {
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

  it("tracks session metrics, timestamps, and validation iterations", () => {
    const tracker = new SessionMetricsTracker(2, "dev-a");
    tracker.startSession({ operatorId: "test-op", characterId: "dev-a", initialIssueCount: 2 });
    tracker.recordAdjustment("pivot");
    tracker.recordAdjustment("anchor");
    tracker.recordUndo();
    tracker.recordRedo();

    tracker.updateIssueCount(0);
    const summary = tracker.getSummary();

    expect(summary.totalAdjustments).toBe(2);
    expect(summary.pivotEditCount).toBe(1);
    expect(summary.anchorEditCount).toBe(1);
    expect(summary.totalUndos).toBe(1);
    expect(summary.totalRedos).toBe(1);
    expect(summary.undoCount).toBe(1);
    expect(summary.redoCount).toBe(1);
    expect(summary.validationIterations).toBe(2);
    expect(summary.engineeringCompliance).toBe(true);
    expect(summary.finalValidity).toBe("PENDING_VISUAL_REVIEW");
    expect(summary.gateStatus).toBe("PENDING_VISUAL_REVIEW");
    expect(summary.sessionStartTimestamp).toBeDefined();

    const ended = tracker.endSession("PASS");
    expect(ended.finalValidity).toBe("PASS");
    expect(ended.gateStatus).toBe("PASS");
    expect(ended.sessionEndTimestamp).toBeDefined();
    expect(ended.timeToEngineeringComplianceSeconds).not.toBeNull();
  });

  it("verifies explicit session lifecycle: IDLE -> ACTIVE -> ENDED with frozen snapshot", () => {
    const tracker = new SessionMetricsTracker(1, "real-normal-01");
    expect(tracker.getStatus()).toBe("IDLE");
    expect(tracker.isActive()).toBe(false);

    // Start session
    tracker.startSession({
      operatorId: "human-01",
      characterId: "real-normal-01",
      initialIssueCount: 1,
      baselineDigest: "sha256-test-digest"
    });
    expect(tracker.getStatus()).toBe("ACTIVE");
    expect(tracker.isActive()).toBe(true);

    tracker.recordAdjustment("pivot", "upper_arm_R", [0.5, 0.2]);
    tracker.recordAdjustment("anchor", "upper_arm_R", [0.5, 0.85]);
    tracker.recordAdjustment("position", "torso");
    tracker.updateIssueCount(0);
    tracker.markExported();

    // End session
    const ended = tracker.endSession("PASS");
    expect(ended.status).toBe("ENDED");
    expect(ended.totalAdjustments).toBe(3);
    expect(ended.pivotEditCount).toBe(1);
    expect(ended.anchorEditCount).toBe(1);
    expect(ended.positionOverrideCount).toBe(1);
    expect(ended.exported).toBe(true);
    expect(ended.visualReviewStatus).toBe("PASS");
    expect(ended.finalValidity).toBe("PASS");
    expect(ended.timeToHumanVisualAcceptanceSeconds).not.toBeNull();

    const frozenDuration = ended.sessionDurationSeconds;
    const frozenEndTs = ended.sessionEndTimestamp;

    // Mutating actions after ENDED must be ignored and not alter frozen record
    tracker.recordAdjustment("pivot");
    tracker.recordUndo();
    const secondSummary = tracker.getSummary();

    expect(secondSummary.totalAdjustments).toBe(3);
    expect(secondSummary.totalUndos).toBe(0);
    expect(secondSummary.sessionDurationSeconds).toBe(frozenDuration);
    expect(secondSummary.sessionEndTimestamp).toBe(frozenEndTs);
  });

  it("applies, validates, and undoes SetPartPivotCommand and SetPartDistalAnchorCommand", () => {
    const initialPivot = [...doc.character.parts["upper_arm_R"].pivot];
    expect(initialPivot).toBeDefined();

    // 1. Set part pivot
    const pivotCmd = new SetPartPivotCommand("upper_arm_R", [0.45, 0.25]);
    history.execute(pivotCmd);
    expect(doc.character.parts["upper_arm_R"].pivot).toEqual([0.45, 0.25]);

    // Undo pivot
    history.undo();
    expect(doc.character.parts["upper_arm_R"].pivot).toEqual(initialPivot);

    // Redo pivot
    history.redo();
    expect(doc.character.parts["upper_arm_R"].pivot).toEqual([0.45, 0.25]);

    // 2. Set part distal anchor
    const anchorCmd = new SetPartDistalAnchorCommand("upper_arm_R", [0.55, 0.88]);
    history.execute(anchorCmd);
    expect(doc.character.parts["upper_arm_R"].distalAnchor).toEqual([0.55, 0.88]);

    // Clamping test: out of bounds values are clamped to [0, 1]
    const clampCmd = new SetPartPivotCommand("upper_arm_R", [-0.5, 1.8]);
    history.execute(clampCmd);
    expect(doc.character.parts["upper_arm_R"].pivot).toEqual([0.0, 1.0]);

    // Undo clamp
    history.undo();
    expect(doc.character.parts["upper_arm_R"].pivot).toEqual([0.45, 0.25]);
  });

  it("Finding A: enforces canonical rig and envelope immutability via deep-freeze", () => {
    // Clone and deep-freeze canonical rigs and envelopes to mechanically forbid mutation
    const frozenRigs = deepFreeze(JSON.parse(JSON.stringify(rigs)));
    const frozenEnvelopes = deepFreeze(JSON.parse(JSON.stringify(envelopes)));

    const testDoc = new EditorDocument(characterFixture, frozenRigs, frozenEnvelopes, clips);
    const testHistory = new HistoryManager(testDoc);

    // Initial canonical snapshot before any user edits
    const canonicalSnapshot = JSON.stringify(frozenRigs);

    // 1. Set bone override
    testHistory.execute(new SetBoneOverrideCommand("torso", { x: 10, y: 15 }));

    // 2. Set distal anchor
    testHistory.execute(new SetDistalAnchorCommand("upper_arm_R", { x: 150, y: 300 }));

    // 3. Rebind character part to slot
    testHistory.execute(new SetPartSlotBindingCommand("weapon", "slot_hand_L"));

    // 4. Update setup draw order override
    testHistory.execute(new SetSetupDrawOrderCommand({ slot_torso: 99, slot_head: 100 }));

    // 5. Change family
    testHistory.execute(new ChangeFamilyCommand("humanoid-heavy-v1"));

    // 6. Undo all commands
    testHistory.undo();
    testHistory.undo();
    testHistory.undo();
    testHistory.undo();
    testHistory.undo();

    // 7. Redo all commands
    testHistory.redo();
    testHistory.redo();
    testHistory.redo();
    testHistory.redo();
    testHistory.redo();

    // Invariant: frozenRigs must remain 100% byte-equal to original canonical snapshot
    expect(JSON.stringify(frozenRigs)).toBe(canonicalSnapshot);
    expect(Object.isFrozen(frozenRigs["humanoid-normal-v1"])).toBe(true);
    expect(Object.isFrozen(frozenRigs["humanoid-normal-v1"].slots)).toBe(true);
    expect(Object.isFrozen(frozenRigs["humanoid-normal-v1"].slots[0])).toBe(true);
  });

  it("Finding A: isolates two EditorDocuments sharing the same availableRigs instance", () => {
    const sharedRigs = JSON.parse(JSON.stringify(rigs));
    const canonicalNormalSlotsOriginal = JSON.parse(JSON.stringify(sharedRigs["humanoid-normal-v1"].slots));

    const docA = new EditorDocument(characterFixture, sharedRigs, envelopes, clips);
    const historyA = new HistoryManager(docA);

    const docB = new EditorDocument(characterFixture, sharedRigs, envelopes, clips);

    // Edit Document A: change part slot binding and setup draw order override
    historyA.execute(new SetPartSlotBindingCommand("weapon", "slot_hand_L"));
    historyA.execute(new SetSetupDrawOrderCommand({ slot_torso: 15 }));

    // Document A has updated character data
    expect(docA.character.parts["weapon"].slot).toBe("slot_hand_L");
    expect(docA.character.setupDrawOrderOverrides?.["slot_torso"]).toBe(15);

    // Document B must observe completely untouched original canonical slots and character data
    expect(docB.character.parts["weapon"].slot).toBe("slot_weapon");
    expect(docB.character.setupDrawOrderOverrides?.["slot_torso"]).toBeUndefined();
    expect(sharedRigs["humanoid-normal-v1"].slots).toEqual(canonicalNormalSlotsOriginal);
  });

  it("Finding B: computes distal anchor world transform correctly with unrotated parent (0°)", () => {
    // upper_arm_L parent is torso. Test when torso rotation is 0°
    const targetWorld = { x: 250.0, y: 400.0 };

    history.execute(new SetDistalAnchorCommand("upper_arm_L", targetWorld));

    const transforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    const distalEndpoint = transforms["upper_arm_L"].distalEndpoint;

    expect(distalEndpoint[0]).toBeCloseTo(targetWorld.x, 2);
    expect(distalEndpoint[1]).toBeCloseTo(targetWorld.y, 2);
  });

  it("Finding B: computes distal anchor world transform correctly with parent rotation (+30°)", () => {
    // Rotate parent bone 'torso' by +30°
    history.execute(new SetBoneOverrideCommand("torso", { rotation: 30.0 }));

    const targetWorld = { x: 280.0, y: 420.0 };
    history.execute(new SetDistalAnchorCommand("upper_arm_L", targetWorld));

    const transforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    const distalEndpoint = transforms["upper_arm_L"].distalEndpoint;

    // Distal endpoint in world space must match requested worldTarget within strict tolerance
    expect(distalEndpoint[0]).toBeCloseTo(targetWorld.x, 2);
    expect(distalEndpoint[1]).toBeCloseTo(targetWorld.y, 2);
  });

  it("Finding B: computes distal anchor world transform correctly with parent rotation (-45°)", () => {
    // Rotate parent bone 'torso' by -45°
    history.execute(new SetBoneOverrideCommand("torso", { rotation: -45.0 }));

    const targetWorld = { x: 190.0, y: 360.0 };
    history.execute(new SetDistalAnchorCommand("upper_arm_L", targetWorld));

    const transforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    const distalEndpoint = transforms["upper_arm_L"].distalEndpoint;

    expect(distalEndpoint[0]).toBeCloseTo(targetWorld.x, 2);
    expect(distalEndpoint[1]).toBeCloseTo(targetWorld.y, 2);
  });

  it("Finding B: handles nested parent rotations and round-trips via undo and redo", () => {
    // Root bone root -> pelvis -> torso -> upper_arm_L -> forearm_L
    // Rotate torso by +25° and upper_arm_L by -15° (nested hierarchy)
    history.execute(new SetBoneOverrideCommand("torso", { rotation: 25.0 }));
    history.execute(new SetBoneOverrideCommand("upper_arm_L", { rotation: -15.0 }));

    const initialTransforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    const initialEndpoint = initialTransforms["forearm_L"].distalEndpoint;

    // Adjust distal anchor of forearm_L to arbitrary world target
    const targetWorld = { x: 310.5, y: 460.2 };
    history.execute(new SetDistalAnchorCommand("forearm_L", targetWorld));

    // Endpoint must reach targetWorld
    const newTransforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    expect(newTransforms["forearm_L"].distalEndpoint[0]).toBeCloseTo(targetWorld.x, 2);
    expect(newTransforms["forearm_L"].distalEndpoint[1]).toBeCloseTo(targetWorld.y, 2);

    // Undo must restore original endpoint
    history.undo();
    const undoneTransforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    expect(undoneTransforms["forearm_L"].distalEndpoint[0]).toBeCloseTo(initialEndpoint[0], 2);
    expect(undoneTransforms["forearm_L"].distalEndpoint[1]).toBeCloseTo(initialEndpoint[1], 2);

    // Redo must return to targetWorld
    history.redo();
    const redoneTransforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
    expect(redoneTransforms["forearm_L"].distalEndpoint[0]).toBeCloseTo(targetWorld.x, 2);
    expect(redoneTransforms["forearm_L"].distalEndpoint[1]).toBeCloseTo(targetWorld.y, 2);
  });

  it("Finding A & Compiler: compiles character with setupDrawOrderOverrides without mutating canonical rig", () => {
    const canonicalRigCopy = JSON.parse(JSON.stringify(doc.targetRig));

    // Apply setup draw order override
    history.execute(
      new SetSetupDrawOrderCommand({
        slot_torso: 120,
        slot_head: 15
      })
    );

    expect(doc.character.setupDrawOrderOverrides?.["slot_torso"]).toBe(120);
    expect(doc.character.setupDrawOrderOverrides?.["slot_head"]).toBe(15);

    // Resolve skeleton
    const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
    const torsoSlot = skeleton.slots.find((s) => s.id === "slot_torso");
    const headSlot = skeleton.slots.find((s) => s.id === "slot_head");
    expect(torsoSlot?.defaultDrawOrder).toBe(120);
    expect(headSlot?.defaultDrawOrder).toBe(15);

    // Compile character
    const compileRes = compileCharacter(doc.targetRig, doc.character, Object.values(clips));
    expect(compileRes.success).toBe(true);
    expect(compileRes.compiled).toBeDefined();

    const compiledTorsoSlot = compileRes.compiled!.slots.find((s) => s.id === "slot_torso");
    const compiledHeadSlot = compileRes.compiled!.slots.find((s) => s.id === "slot_head");
    expect(compiledTorsoSlot?.defaultDrawOrder).toBe(120);
    expect(compiledHeadSlot?.defaultDrawOrder).toBe(15);

    // Assert canonical rig was NOT modified
    expect(doc.targetRig).toEqual(canonicalRigCopy);
  });

  it("Export and load round-trip preserves all character-owned overrides without leaking canonical data", () => {
    history.execute(new SetBoneOverrideCommand("torso", { x: 4.0, y: -2.0, rotation: 3.5, length: 180.0 }));
    history.execute(new SetPartSlotBindingCommand("weapon", "slot_hand_L"));
    history.execute(new SetSetupDrawOrderCommand({ slot_torso: 88 }));

    const exportedJson = doc.exportJson();
    const reloadedCharacter = JSON.parse(exportedJson) as CharacterDefinition;

    expect(reloadedCharacter.boneOverrides?.["torso"]).toEqual({
      x: 4.0,
      y: -2.0,
      rotation: 3.5,
      length: 180.0
    });
    expect(reloadedCharacter.parts["weapon"].slot).toBe("slot_hand_L");
    expect(reloadedCharacter.setupDrawOrderOverrides?.["slot_torso"]).toBe(88);
    expect(reloadedCharacter.rig).toBe("humanoid-normal-v1");

    // Instantiating a new document from reloaded JSON matches state exactly
    const reloadedDoc = new EditorDocument(reloadedCharacter, rigs, envelopes, clips);
    expect(reloadedDoc.character).toEqual(doc.character);
  });
});

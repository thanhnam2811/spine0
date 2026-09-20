import { describe, it, expect } from "vitest";
import {
  SessionMetricsTracker,
  computeStringSha256
} from "../apps/editor/src/model/metrics.js";
import { EditorDocument } from "../apps/editor/src/model/document.js";
import { HistoryManager } from "../apps/editor/src/model/history.js";
import {
  SetPartPivotCommand,
  SetPartDistalAnchorCommand,
  SetBoneDistalTipCommand,
  SetBoneOverrideCommand,
  SetPartSlotBindingCommand,
  SetSetupDrawOrderCommand,
  ChangeFamilyCommand
} from "../apps/editor/src/model/commands.js";
import { validateCharacter } from "../packages/validator/src/validate.js";
import {
  PRESET_RIGS,
  PRESET_ENVELOPES,
  PRESET_ANIMATIONS,
  PRESET_CHARACTERS
} from "../apps/editor/src/presets.js";

describe("Phase C.1 Session Hardening & Gate Readiness Tests", () => {
  it("Invariant 1: IDLE adjustments are strictly ignored by tracker", () => {
    const tracker = new SessionMetricsTracker(2, "real-normal-01");
    expect(tracker.getStatus()).toBe("IDLE");
    expect(tracker.isActive()).toBe(false);

    // Attempting mutations in IDLE
    tracker.recordAdjustment("pivot", "torso", [0.5, 0.5]);
    tracker.recordAdjustment("anchor", "upper_arm_R");
    tracker.recordAdjustment("position", "torso");
    tracker.recordUndo();
    tracker.recordRedo();
    tracker.markExported();

    expect(tracker.getTotalAdjustments()).toBe(0);
    const summary = tracker.getSummary();
    expect(summary.totalAdjustments).toBe(0);
    expect(summary.pivotEditCount).toBe(0);
    expect(summary.anchorEditCount).toBe(0);
    expect(summary.positionOverrideCount).toBe(0);
    expect(summary.totalUndos).toBe(0);
    expect(summary.totalRedos).toBe(0);
    expect(summary.exported).toBe(false);
    expect(summary.eventLog).toHaveLength(0);
  });

  it("Invariant 2 & 3: startSession() resets all state and captures baseline SHA-256", () => {
    const tracker = new SessionMetricsTracker(3, "real-heavy-01");
    const baselineJson = JSON.stringify(PRESET_CHARACTERS["real-heavy-01"]);
    const expectedSha = computeStringSha256(baselineJson);

    tracker.startSession({
      operatorId: "tech_artist_01",
      characterId: "real-heavy-01",
      initialIssueCount: 3,
      baselineCharacterJson: baselineJson
    });

    expect(tracker.getStatus()).toBe("ACTIVE");
    expect(tracker.isActive()).toBe(true);
    expect(tracker.getOperatorId()).toBe("tech_artist_01");
    expect(tracker.getCharacterId()).toBe("real-heavy-01");

    const summary = tracker.getSummary();
    expect(summary.totalAdjustments).toBe(0);
    expect(summary.totalUndos).toBe(0);
    expect(summary.totalRedos).toBe(0);
    expect(summary.initialIssueCount).toBe(3);
    expect(summary.currentIssues).toBe(3);
    expect(summary.baselineCharacterSha256).toBe(expectedSha);
    expect(summary.eventLog[0].type).toBe("session_started");
  });

  it("Invariant 4: Only commands executed during ACTIVE session are counted in metrics", () => {
    const char = PRESET_CHARACTERS["real-normal-01"];
    const doc = new EditorDocument(
      char,
      PRESET_RIGS,
      PRESET_ENVELOPES,
      PRESET_ANIMATIONS[char.rig]
    );
    const history = new HistoryManager(doc);
    const tracker = new SessionMetricsTracker(doc.validation.issues.length, char.id);

    history.onCommandCommitted((cmd) => {
      const category = (cmd as any).telemetryCategory;
      const target = (cmd as any).partKey ?? (cmd as any).boneId;
      tracker.recordAdjustment(category, target);
    });

    // Execute in IDLE
    history.execute(new SetPartPivotCommand("torso", [0.5, 0.4]));
    expect(tracker.getTotalAdjustments()).toBe(0);

    // Now start session
    tracker.startSession({ operatorId: "human-01", characterId: char.id });
    history.execute(new SetPartPivotCommand("torso", [0.5, 0.45]));
    expect(tracker.getTotalAdjustments()).toBe(1);
    expect(tracker.getSummary().pivotEditCount).toBe(1);
  });

  it("Invariant 5: Exactly 1 coalesced drag transaction = 1 typed adjustment in history and telemetry", () => {
    const char = PRESET_CHARACTERS["real-normal-01"];
    const doc = new EditorDocument(
      char,
      PRESET_RIGS,
      PRESET_ENVELOPES,
      PRESET_ANIMATIONS[char.rig]
    );
    const history = new HistoryManager(doc);
    const tracker = new SessionMetricsTracker(0, char.id);
    tracker.startSession({ operatorId: "human-01", characterId: char.id });

    history.onCommandCommitted((cmd) => {
      const category = (cmd as any).telemetryCategory;
      const target = (cmd as any).partKey ?? (cmd as any).boneId;
      tracker.recordAdjustment(category, target);
    });

    // Simulate mouse drag of 5 continuous micro-steps
    history.beginTransaction("Drag torso pivot", "spritePivot");
    for (let i = 1; i <= 5; i++) {
      history.execute(new SetPartPivotCommand("torso", [0.5, 0.4 + i * 0.01]));
    }
    history.commitTransaction();

    // Must be exactly 1 command in history and 1 typed adjustment in tracker
    expect(history.canUndo()).toBe(true);
    expect(tracker.getTotalAdjustments()).toBe(1);
    expect(tracker.getSummary().pivotEditCount).toBe(1);
    expect(tracker.getSummary().anchorEditCount).toBe(0);
  });

  it("Invariant 6: Bone distal tip drag resolves to boneRotation/boneLength, not sprite anchor", () => {
    const cmd = new SetBoneDistalTipCommand("upper_arm_R", 25, 95);
    expect(cmd.telemetryCategory).toBe("boneRotation");

    const tracker = new SessionMetricsTracker(0, "test");
    tracker.startSession({ operatorId: "human-01" });
    tracker.recordAdjustment(cmd.telemetryCategory, cmd.boneId);

    expect(tracker.getSummary().rotationOverrideCount).toBe(1);
    expect(tracker.getSummary().anchorEditCount).toBe(0);
  });

  it("Invariant 7, 8, 9: SetBoneOverrideCommand categorizes correctly by property", () => {
    const rotCmd = new SetBoneOverrideCommand("upper_arm_R", { rotation: 15 });
    expect(rotCmd.telemetryCategory).toBe("boneRotation");

    const lenCmd = new SetBoneOverrideCommand("upper_arm_R", { length: 110 });
    expect(lenCmd.telemetryCategory).toBe("boneLength");

    const posCmd = new SetBoneOverrideCommand("upper_arm_R", { x: 5, y: -2 });
    expect(posCmd.telemetryCategory).toBe("bonePosition");

    const tracker = new SessionMetricsTracker(0, "test");
    tracker.startSession({ operatorId: "human-01" });

    tracker.recordAdjustment(rotCmd.telemetryCategory, rotCmd.boneId);
    tracker.recordAdjustment(lenCmd.telemetryCategory, lenCmd.boneId);
    tracker.recordAdjustment(posCmd.telemetryCategory, posCmd.boneId);

    const summary = tracker.getSummary();
    expect(summary.rotationOverrideCount).toBe(1);
    expect(summary.lengthOverrideCount).toBe(1);
    expect(summary.positionOverrideCount).toBe(1);
    expect(summary.totalAdjustments).toBe(3);
  });

  it("Invariant 10: Undo and Redo only record when session is ACTIVE", () => {
    const tracker = new SessionMetricsTracker(0, "test");
    tracker.recordUndo();
    tracker.recordRedo();
    expect(tracker.getSummary().totalUndos).toBe(0);
    expect(tracker.getSummary().totalRedos).toBe(0);

    tracker.startSession();
    tracker.recordUndo();
    tracker.recordRedo();
    expect(tracker.getSummary().totalUndos).toBe(1);
    expect(tracker.getSummary().totalRedos).toBe(1);
  });

  it("Invariant 11: endSession() freezes record and ignores post-session mutations", () => {
    const tracker = new SessionMetricsTracker(0, "real-normal-01");
    tracker.startSession();
    tracker.recordAdjustment("pivot", "torso");

    const ended = tracker.endSession("PASS", "Visual inspection clean");
    expect(ended.status).toBe("ENDED");
    expect(ended.visualReviewStatus).toBe("PASS");
    expect(ended.visualNotes).toBe("Visual inspection clean");
    expect(ended.totalAdjustments).toBe(1);
    expect(tracker.isEnded()).toBe(true);
    expect(tracker.isActive()).toBe(false);

    // Attempt mutation after ENDED
    tracker.recordAdjustment("pivot", "torso");
    tracker.recordUndo();

    const currentSummary = tracker.getSummary();
    expect(currentSummary.totalAdjustments).toBe(1);
    expect(currentSummary.totalUndos).toBe(0);
  });

  it("Invariant 12: exportEndedRecord() returns null when IDLE or ACTIVE, succeeds only when ENDED", () => {
    const tracker = new SessionMetricsTracker(0, "real-small-01");
    expect(tracker.exportEndedRecord()).toBeNull();

    tracker.startSession();
    expect(tracker.exportEndedRecord()).toBeNull();

    tracker.endSession("PASS");
    const exported = tracker.exportEndedRecord();
    expect(exported).not.toBeNull();
    expect(exported?.status).toBe("ENDED");
    expect(exported?.characterId).toBe("real-small-01");
  });

  it("Invariant 13: Strict 4-way visual review gate mapping", () => {
    // Case 1: Engineering compliant + NOT_REVIEWED -> PENDING_VISUAL_REVIEW (NEVER "PASS")
    const tracker1 = new SessionMetricsTracker(0, "test-1");
    tracker1.startSession();
    tracker1.updateIssueCount(0);
    const res1 = tracker1.endSession("NOT_REVIEWED");
    expect(res1.engineeringCompliance).toBe(true);
    expect(res1.visualReviewStatus).toBe("NOT_REVIEWED");
    expect(res1.finalValidity).toBe("PENDING_VISUAL_REVIEW");
    expect(res1.gateStatus).toBe("PENDING_VISUAL_REVIEW");

    // Case 2: Engineering compliant + PASS -> PASS
    const tracker2 = new SessionMetricsTracker(0, "test-2");
    tracker2.startSession();
    tracker2.updateIssueCount(0);
    const res2 = tracker2.endSession("PASS");
    expect(res2.engineeringCompliance).toBe(true);
    expect(res2.visualReviewStatus).toBe("PASS");
    expect(res2.finalValidity).toBe("PASS");
    expect(res2.gateStatus).toBe("PASS");

    // Case 3: Engineering compliant + FAIL -> FAIL
    const tracker3 = new SessionMetricsTracker(0, "test-3");
    tracker3.startSession();
    tracker3.updateIssueCount(0);
    const res3 = tracker3.endSession("FAIL", "Joint tore apart at shoulder");
    expect(res3.engineeringCompliance).toBe(true);
    expect(res3.visualReviewStatus).toBe("FAIL");
    expect(res3.finalValidity).toBe("FAIL");
    expect(res3.gateStatus).toBe("FAIL");

    // Case 4: Engineering violations present (issues > 0) + PASS -> FAIL
    const tracker4 = new SessionMetricsTracker(1, "test-4");
    tracker4.startSession();
    tracker4.updateIssueCount(2);
    const res4 = tracker4.endSession("PASS");
    expect(res4.engineeringCompliance).toBe(false);
    expect(res4.visualReviewStatus).toBe("PASS");
    expect(res4.finalValidity).toBe("FAIL");
    expect(res4.gateStatus).toBe("FAIL");
  });

  it("Invariant 14: abortSession() discards active session without producing valid gate record", () => {
    const tracker = new SessionMetricsTracker(0, "real-normal-01");
    tracker.startSession();
    tracker.recordAdjustment("pivot", "torso");
    expect(tracker.isActive()).toBe(true);

    tracker.abortSession();
    expect(tracker.getStatus()).toBe("IDLE");
    expect(tracker.isActive()).toBe(false);
    expect(tracker.exportEndedRecord()).toBeNull();
  });

  it("Invariant 15: Validator rejects invalid PartDefinition.bone with ANIM_UNKNOWN_BONE (Finding 7)", () => {
    const validChar = PRESET_CHARACTERS["real-normal-01"];
    const rig = PRESET_RIGS[validChar.rig];
    const envelope = PRESET_ENVELOPES[validChar.rig];

    // Pristine character should validate
    const initialResult = validateCharacter(validChar, rig, envelope);
    const initialErrors = initialResult.issues.filter((i) => i.severity === "error");
    expect(initialErrors).toHaveLength(0);

    // Corrupt one part definition with an unmapped bone
    const corruptedChar = JSON.parse(JSON.stringify(validChar));
    corruptedChar.parts.torso.bone = "non_existent_ghost_bone";

    const corruptedResult = validateCharacter(corruptedChar, rig, envelope);
    const unknownBoneIssue = corruptedResult.issues.find(
      (issue) => issue.code === "ANIM_UNKNOWN_BONE"
    );
    expect(unknownBoneIssue).toBeDefined();
    expect(unknownBoneIssue?.message).toContain("non_existent_ghost_bone");
  });

  it("P0-1: computeStringSha256 matches FIPS 180-4 known vectors and Unicode standard", () => {
    // 1. Empty string known vector
    expect(computeStringSha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    // 2. "abc" standard NIST vector
    expect(computeStringSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    // 3. Unicode UTF-8 string
    const unicodeText = "Xin chào thế giới 🐉";
    expect(computeStringSha256(unicodeText)).toBe("dd7ba9568c95b813dc519d462d7f917bc1aa03adfdd64f67def099dee862b06b");
    // 4. Standard fox test string
    const fox = "The quick brown fox jumps over the lazy dog";
    expect(computeStringSha256(fox)).toBe("d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
  });

  it("P0-1: baseline and final character hashes in session telemetry are genuine SHA-256", () => {
    const tracker = new SessionMetricsTracker(0, "real-normal-01");
    const char = PRESET_CHARACTERS["real-normal-01"];
    const charJson = JSON.stringify(char);
    const expectedBaselineSha = computeStringSha256(charJson);

    tracker.startSession({
      characterId: "real-normal-01",
      baselineCharacterJson: charJson
    });
    expect(tracker.getSummary().baselineCharacterSha256).toBe(expectedBaselineSha);

    const updatedChar = { ...char, name: "real-normal-01-modified" };
    const updatedJson = JSON.stringify(updatedChar);
    const expectedFinalSha = computeStringSha256(updatedJson);

    const record = tracker.endSession("PASS", "all verified", updatedJson);
    expect(record.finalCharacterSha256).toBe(expectedFinalSha);
    expect(record.baselineCharacterSha256).toBe(expectedBaselineSha);
  });

  it("P1-2: disallow endSession() outside ACTIVE lifecycle (cannot end from IDLE)", () => {
    const idleTracker = new SessionMetricsTracker(0, "real-normal-01");
    expect(idleTracker.getStatus()).toBe("IDLE");

    // Attempting to endSession directly from IDLE must throw
    expect(() => {
      idleTracker.endSession("PASS");
    }).toThrow(/must be "ACTIVE"/);

    expect(idleTracker.getStatus()).toBe("IDLE");
    expect(idleTracker.exportEndedRecord()).toBeNull();
  });

  it("P1-1: ended SessionRecord is deeply frozen and cannot be externally mutated", () => {
    const tracker = new SessionMetricsTracker(0, "real-normal-01");
    tracker.startSession({ characterId: "real-normal-01" });
    tracker.recordAdjustment("pivot", "torso", { u: 0.5, v: 0.5 });
    const record = tracker.endSession("PASS", "Inspection note");

    // Verify record itself is frozen
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.eventLog)).toBe(true);
    expect(Object.isFrozen(record.eventLog[0])).toBe(true);
    if (record.eventLog[0].value && typeof record.eventLog[0].value === "object") {
      expect(Object.isFrozen(record.eventLog[0].value)).toBe(true);
    }

    // Attempt mutation on array: should throw in strict mode
    expect(() => {
      (record.eventLog as any).push({ ts: "now", type: "fabricated_event" });
    }).toThrow();

    // Attempt mutation on nested property: should throw in strict mode
    if (record.eventLog[0].value && typeof record.eventLog[0].value === "object") {
      expect(() => {
        (record.eventLog[0].value as any).tampered = true;
      }).toThrow();
    }

    // Defensive copy guarantee: exportEndedRecord() returns pristine deep copy
    const exportCopy = tracker.exportEndedRecord()!;
    expect(exportCopy.eventLog.filter(e => e.type === "fabricated_event")).toHaveLength(0);
  });

  it("P1-2: repeated endSession() on already ENDED tracker is idempotent", () => {
    const tracker = new SessionMetricsTracker(0, "real-normal-01");
    tracker.startSession({ characterId: "real-normal-01" });
    const rec1 = tracker.endSession("PASS", "first end");
    expect(rec1.status).toBe("ENDED");

    // Repeated call returns frozen record without throwing or re-ending
    const rec2 = tracker.endSession("PASS", "second end");
    expect(rec2.status).toBe("ENDED");
    expect(rec2.sessionEndTimestamp).toBe(rec1.sessionEndTimestamp);
    expect(rec2.visualNotes).toBe("first end");
  });
});

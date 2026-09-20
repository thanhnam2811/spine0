# Phase C.1: Human Operator Session Protocol

**Document**: `docs/phase-c1/human-session-protocol.md`  
**Target Applications**: Minimal Rig Adjuster (`apps/editor/`, `pnpm editor`)  
**Target Characters**: `real-normal-01`, `real-heavy-01`, `real-small-01`  
**Operator ID Convention**: `human-01`, `human-02`, etc.

---

## 1. Objective

This protocol defines the standardized, auditable procedure that a human operator (technical artist or rigging engineer) must follow when calibrating an imported real Style-B character in the Spine0 Rig Adjuster.

Automated scripts or agent-simulated timers are strictly prohibited from generating human session records. All telemetry must be produced by genuine human interaction.

---

## 2. Standardized Operator Task Sequence (15 Steps)

For each character under trial, the human operator executes the following steps in sequence:

1. **Start Session**: Launch the editor (`pnpm editor` at `http://localhost:5174`). Click **[Start Session]** in the session modal or top toolbar.
2. **Select Character**: Choose the character from the preset dropdown (e.g. `real-normal-01`).
3. **Inspect Family Fit**: Check the **Family Fit** panel. Verify that the character naturally aligns with its assigned rig family (`HumanoidNormal`, `HumanoidHeavy`, or `HumanoidSmall`).
4. **Inspect Initial Issues**: Note any initial contract or envelope warnings in the **Validator** panel.
5. **Calibrate Joint Pivots**: In `SETUP` mode, select limb bones (`upper_arm`, `forearm`, `thigh`, `shin`, `foot`) and adjust the pivot handle $(\text{pivot}_x, \text{pivot}_y)$ to sit accurately at the illustrated joint socket.
6. **Calibrate Distal Anchors**: Drag the distal anchor handle $(\text{anchor}_x, \text{anchor}_y)$ to the limb articulation terminus (e.g. elbow tip, wrist, knee, ankle).
7. **Apply Bounded Setup Overrides**: If the illustrated character proportions vary slightly from nominal, adjust bone length ($\Delta L$) and rest rotation ($\Delta \theta$) within the safe envelope bounds (keeping Material Override Ratio $\le 40\%$).
8. **Inspect Slot Mappings**: In the **Hierarchy** panel, confirm that all 15 parts are bound to their correct anatomical slots.
9. **Inspect Setup Draw Orders**: Verify that visual layering (e.g. near arm in front of torso, far arm behind torso) is aesthetically correct.
10. **Preview Idle Clip**: Switch to `PREVIEW` mode (Key `2`). Play the `idle` animation clip. Inspect torso breathing displacement and root stability.
11. **Preview Run Clip**: Select the `run` animation clip. Scrub or play back at $0.5\times$ speed. Visually check foot contact against the ground datum line ($y = 1000$) and ensure no knee popping occurs.
12. **Preview Slash Clip**: Select the `slash` animation clip. Inspect dynamic draw order switching (weapon behind torso on windup, in front on impact). Inspect weapon sweep clearance around bulky pauldrons or cranial hair.
13. **Visual Seam Inspection**: Zoom in ($200\%$) on shoulder, elbow, hip, and knee joints across extreme angles. Ensure convex bleed overlaps prevent any visible background gaps.
14. **Export Adjusted Character**: Click **[Export JSON]** in the toolbar to save the calibrated `character.json`.
15. **End Session & Export Telemetry**: Open the **Session Metrics** dialog, click **[End Session & Export Telemetry]**, and save the resulting session record.

---

## 3. Session Record Telemetry Schema

The session telemetry exported by the editor conforms to the following schema:

```json
{
  "operatorId": "human-01",
  "sessionStartTimestamp": "2026-09-20T11:15:00.000Z",
  "sessionEndTimestamp": "2026-09-20T11:21:42.000Z",
  "sessionDurationSeconds": 402,
  "characterId": "real-normal-01",
  "initialIssueCount": 2,
  "finalIssueCount": 0,
  "pivotEditCount": 6,
  "anchorEditCount": 6,
  "positionOverrideCount": 2,
  "rotationOverrideCount": 2,
  "lengthOverrideCount": 4,
  "slotRemapCount": 0,
  "drawOrderEditCount": 0,
  "undoCount": 1,
  "redoCount": 0,
  "validationIterations": 3,
  "rawJsonUsed": false,
  "exported": true,
  "finalValidity": "PASS",
  "eventLog": [
    { "ts": "2026-09-20T11:15:00.000Z", "type": "session_started" },
    { "ts": "2026-09-20T11:16:12.000Z", "type": "pivot_changed", "target": "forearm_R", "value": [0.50, 0.16] },
    { "ts": "2026-09-20T11:21:42.000Z", "type": "session_ended" }
  ]
}
```

Records are deposited into `docs/phase-c1/human-sessions.json` upon completion of the human gate.

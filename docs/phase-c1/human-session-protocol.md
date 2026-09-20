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

1. **Select Character**: Launch the editor (`pnpm editor` at `http://localhost:5174`). Choose the character from the preset dropdown (e.g. `real-normal-01`) *before* starting the session, as character switching is locked while a session is active.
2. **Start Session**: Click **[Start Session]** in the top toolbar. Enter Operator ID (e.g. `human-01`) and click **[Begin Session Tracking]**. This captures baseline character state and starts the timer.
3. **Inspect Family Fit**: Check the **Family Fit** panel. Verify that the character naturally aligns with its assigned rig family (`HumanoidNormal`, `HumanoidHeavy`, or `HumanoidSmall`).
4. **Inspect Initial Issues**: Note any initial contract or envelope warnings in the **Validator** panel.
5. **Calibrate Sprite Pivots**: In `SETUP` mode, select each Part (`upper_arm`, `forearm`, `thigh`, `shin`, `foot`, etc.) in the Hierarchy or Viewport and adjust the Part Pivot handle $(U, V)$ to sit accurately at the illustrated joint socket.
6. **Calibrate Sprite Distal Anchors**: Adjust Part Distal Anchor handle $(U, V)$ to the limb articulation terminus (e.g. elbow tip, wrist, knee, ankle).
7. **Apply Bounded Bone Setup Overrides**: If the illustrated character proportions require skeletal adjustment, select the Bone and adjust bone length ($\Delta L$) and rest rotation ($\Delta \theta$) within the safe envelope bounds (keeping Material Override Ratio $\le 40\%$).
8. **Inspect Slot Mappings**: In the **Hierarchy** panel, confirm that all 16 parts are bound to their correct anatomical slots.
9. **Inspect Setup Draw Orders**: Verify that visual layering (e.g. near arm in front of torso, far arm behind torso) is aesthetically correct.
10. **Preview Idle Clip**: Switch to `PREVIEW` mode (Key `2`). Play the `idle` animation clip. Inspect torso breathing displacement and root stability.
11. **Preview Run Clip**: Select the `run` animation clip. Scrub or play back at $0.5\times$ speed. Visually check foot contact against the ground datum line ($y = 1000$) and ensure no knee popping occurs.
12. **Preview Slash Clip**: Select the `slash` animation clip. Inspect dynamic draw order switching (weapon behind torso on windup, in front on impact). Inspect weapon sweep clearance around bulky pauldrons or cranial hair.
13. **Visual Seam Inspection**: Zoom in ($200\%$) on shoulder, elbow, hip, and knee joints across extreme angles. Ensure convex bleed overlaps prevent any visible background gaps.
14. **Export Adjusted Character**: Click **[Export JSON]** in the toolbar to download the calibrated `${characterId}.character.json`.
15. **End Session & Export Telemetry**: Click **[End Session]** in the toolbar. In the dialog, select the **Visual Review Verdict** (`PASS`, `FAIL`, or `NOT_REVIEWED`), input any visual inspection notes, and click **[End Session & Export Record]**.

---

## 3. Session Record Telemetry Schema & Storage

The session telemetry exported by the editor conforms to the following schema:

```json
{
  "operatorId": "human-01",
  "characterId": "real-normal-01",
  "status": "ENDED",
  "sessionStartTimestamp": "2026-09-20T11:15:00.000Z",
  "sessionEndTimestamp": "2026-09-20T11:21:42.000Z",
  "sessionDurationSeconds": 402,
  "initialIssueCount": 2,
  "finalIssueCount": 0,
  "totalAdjustments": 20,
  "undoCount": 1,
  "redoCount": 0,
  "pivotEditCount": 6,
  "anchorEditCount": 6,
  "positionOverrideCount": 2,
  "rotationOverrideCount": 2,
  "lengthOverrideCount": 4,
  "slotRemapCount": 0,
  "drawOrderEditCount": 0,
  "familyChangeCount": 0,
  "validationIterations": 3,
  "engineeringCompliance": true,
  "visualReviewStatus": "PASS",
  "visualNotes": "Clean joint registration, no seam tearing during run/slash.",
  "baselineCharacterSha256": "c8a...",
  "finalCharacterSha256": "d9b...",
  "timeToEngineeringComplianceSeconds": 245.0,
  "timeToHumanVisualAcceptanceSeconds": 402.0,
  "rawJsonUsed": false,
  "exported": true,
  "finalValidity": "PASS",
  "verdict": "PASS",
  "gateStatus": "PASS",
  "eventLog": [
    { "ts": "2026-09-20T11:15:00.000Z", "type": "session_started", "target": "real-normal-01" },
    { "ts": "2026-09-20T11:16:12.000Z", "type": "pivot_changed", "target": "forearm_R", "value": [0.50, 0.16] },
    { "ts": "2026-09-20T11:21:42.000Z", "type": "session_ended", "target": "real-normal-01", "value": { "durationSeconds": 402, "visualReviewStatus": "PASS" } }
  ]
}
```

Canonical file locations:
- Individual character session records are saved to:
  - `docs/phase-c1/evidence/real-normal-01/human-session.json`
  - `docs/phase-c1/evidence/real-heavy-01/human-session.json`
  - `docs/phase-c1/evidence/real-small-01/human-session.json`
- Aggregate records across all operators are indexed in `docs/phase-c1/human-sessions.json`.

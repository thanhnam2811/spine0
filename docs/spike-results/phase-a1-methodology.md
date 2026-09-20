# Phase A.1 Methodology: Rig-Family Independent Holdout Protocol

**Date**: 2026-09-20  
**Author**: Lead Systems Engineer  
**Status**: Executed & Verified  

---

## 1. Problem Statement & Methodological Correction

In Phase A, the single-geometric-rig hypothesis was falsified by two proportion outliers:
- `test-c` (Heavy Armored Warrior): wide shoulder stance caused sword trajectory to clip bulky shoulder pauldrons.
- `test-e` (Semi-Chibi Goblin Fighter): oversized cranial dome collided with rear windup; short legs caused stride float in canonical run.

Phase A formulated the concept of a small multi-family rig system (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) and prematurely labeled the outcome `RIG-FAMILY ENGINEERING PASS`.

However, using `test-c` and `test-e`—the very fixtures whose failures inspired the family definitions—as proof of the family system constituted a methodological circularity. To obtain credible, falsifiable scientific evidence, Phase A.1 was chartered with strict experimental protocol separation.

---

## 2. Experimental Protocol & Three-Tier Separation

```text
+-----------------------------------------------------------------------------------+
| 1. CALIBRATION DATA (Expanded)                                                    |
|    dev-a, dev-b, dev-c  -> HumanoidNormal calibration                            |
|    test-c               -> HumanoidHeavy calibration                              |
|    test-e               -> HumanoidSmall calibration                              |
|                                                                                   |
|    Objective: Formulate family rest lengths, offsets, envelopes, and templates.   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. CRYPTOGRAPHIC FREEZE GATE                                                      |
|    docs/spike-results/phase-a1-freeze-manifest.json                               |
|    - 3 Family Rigs (Normal, Heavy, Small) SHA-256 locked                          |
|    - 3 Family Envelopes (Normal, Heavy, Small) SHA-256 locked                     |
|    - 7 Animation Templates (Shared Idle, Normal/Heavy/Small Run & Slash) locked   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. INDEPENDENT UNTOUCHED HOLDOUT SET (Phase A.1)                                  |
|    fixtures/family-challenge/                                                     |
|    - normal-01, normal-02 (Brand new standard & flowing silk robe archetypes)     |
|    - heavy-01,  heavy-02  (Brand new tower guardian & broad cleaver marauders)    |
|    - small-01,  small-02  (Brand new halfling rogue & clockwork dwarf engineer)   |
|                                                                                   |
|    Rule: Evaluated strictly with ZERO modification to frozen rigs, envelopes, or  |
|          animations.                                                              |
+-----------------------------------------------------------------------------------+
```

---

## 3. Rig Family Architecture & Mathematical Invariants

Across all 3 families, the following invariants are strictly maintained:
1. **Identical 17-Bone Topology**:
   `root -> pelvis -> torso -> neck -> head`  
   `torso -> upper_arm_L/R -> forearm_L/R -> hand_L/R`  
   `pelvis -> thigh_L/R -> shin_L/R -> foot_L/R`  
   Zero bone additions, removals, or reparentings.
2. **Identical 11 Canonical Slots**:
   `slot_weapon_back`, `slot_robe_back`, `slot_arm_far`, `slot_leg_far`, `slot_pelvis`, `slot_leg_near`, `slot_robe_front`, `slot_torso`, `slot_head`, `slot_arm_near`, `slot_weapon`.
3. **Data-Driven Differences**:
   No code branching in `anim-core`. Differences between families reside exclusively in:
   - Rest bone coordinates $(x, y)$ and lengths;
   - Family anatomy envelope boundary ranges;
   - Family locomotion cadence / pelvis translation scaling;
   - Family combat clearance trajectory.

---

## 4. Family Envelope Separation & Cross-Family Discrimination

To ensure the family system is scientifically discriminative rather than arbitrary, envelopes enforce mutually exclusive ratio intervals:

| Anatomy Ratio Metric | `HumanoidNormal` Envelope | `HumanoidHeavy` Envelope | `HumanoidSmall` Envelope |
| :--- | :--- | :--- | :--- |
| **`head_to_height`** | $[0.14, 0.22]$ | $[0.12, 0.18]$ | $[0.22, 0.32]$ |
| **`shoulder_span_to_height`** | $[0.025, 0.070]$ | $[0.070, 0.110]$ | $[0.020, 0.055]$ |
| **`total_leg_to_height`** | $[0.38, 0.48]$ | $[0.36, 0.45]$ | $[0.22, 0.35]$ |

### Discriminative Properties:
- A `HumanoidHeavy` character has `shoulder_span_to_height > 0.070`, causing immediate rejection by `HumanoidNormal` ($0.070$ max) and `HumanoidSmall` ($0.055$ max).
- A `HumanoidSmall` character has `head_to_height > 0.22` and `total_leg_to_height < 0.35`, causing immediate rejection by `HumanoidNormal` (head max $0.22$, leg min $0.38$) and `HumanoidHeavy` (head max $0.18$).
- A `HumanoidNormal` character has `shoulder_span_to_height < 0.070` and `total_leg_to_height >= 0.38`, causing immediate rejection by `HumanoidHeavy` (shoulder min $0.070$) and `HumanoidSmall` (leg max $0.35$).

---

## 5. Automated Verification Gates

1. **Gate 1: Static Schema & Integrity** (`validateRig`):
   Verify canonical 17 bones, 11 slots, no cyclic graphs.
2. **Gate 2: Family Assignment & Boundary Discrimination** (`validateFamilyAssignment`):
   Character must fit assigned family envelope with 0 errors and be rejected by non-assigned envelopes.
3. **Gate 3: Material Override Ratio Gate** (`computeCharacterMetrics`):
   $\text{material\_override\_ratio} \le 0.40$.
4. **Gate 4: Kinematic Evaluation** (`evaluator.sample`):
   Forward kinematics sampling across `idle`, `run`, and `slash`. Verify draw order keys ($[15, 110, 15]$) and geometric clearance.
5. **Gate 5: Compiler Determinism** (`compileCharacter`):
   Compile to runtime binary JSON format without warnings or errors.

# Phase C Methodology: Real Style-B Art Pipeline & Production Usability Trial

**Date:** 2026-09-20  
**Status:** Approved & Frozen  
**Author:** Lead Systems & Technical Artist  
**Repository:** `thanhnam2811/spine0`  

---

## 1. Context & Research Objective

In Phase A and Phase A.1, the mathematical foundation and rig-family architecture were verified:
- **Phase A**: Falsified the single-geometric-rig hypothesis; established the 17-bone canonical topology and forward kinematics compiler.
- **Phase A.1**: Independently verified the 3-family rig system (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) on 6 holdout characters with 100% test pass rates and zero canonical rig mutations.
- **Phase B / B.2**: Built and verified the desktop Rig Adjuster (`apps/editor`), providing technical artists with interactive visual adjustment, real-time envelope validation, and undo/redo history.

### The Core Phase C Research Question:
> **Can real Style-B humanoid character art be produced consistently, bound to the 3-family rig system, and adjusted in the Rig Adjuster to achieve 100% envelope compliance and shared animation reuse at a fraction of the cost of traditional bespoke rigging?**

---

## 2. Experimental Architecture

```text
+-----------------------------------------------------------------------------------+
| 1. ART GENERATION PROCEDURE (v1.0 Frozen)                                         |
|    docs/phase-c/art-generation-procedure-v1.md                                    |
|    - 15 standardized body/weapon segments                                         |
|    - 1000px canonical reference scale & 3/4 perspective contract                  |
|    - Family proportion envelopes (Normal, Heavy, Small)                           |
|    - Seamless joint rotation overlap margins (12-16px bleed)                      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. PRODUCTION TRIAL CHARACTERS (9 Unique Characters across 3 Families)            |
|    fixtures/production-trial/                                                     |
|    - Normal: normal-01 (Knight),   normal-02 (Blademaster), normal-03 (Cleric)    |
|    - Heavy:  heavy-01  (Bulwark),  heavy-02  (Berserker),   heavy-03  (Halberdier)|
|    - Small:  small-01  (Rogue),    small-02  (Tinkerer),    small-03  (Scout)     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. RIG ADJUSTER USABILITY TELEMETRY                                               |
|    docs/phase-c/usability-sessions.json                                           |
|    - Session duration to full compliance                                          |
|    - Number of discrete pivot / length / rotation adjustments                     |
|    - Undo / Redo frequency                                                        |
|    - Material override budget ratio (<= 0.40 target)                              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 4. PRODUCTION ANIMATION MATRIX EVALUATION                                         |
|    9 Characters x 3 Clips (Idle, Run, Slash) = 27 Runtime Configurations          |
|    - Zero envelope violations in setup pose                                       |
|    - Foot ground-contact stability (penetration <= 4.0px)                         |
|    - Cranial & pauldron clearance safety margins (clearance >= 8.0px)             |
|    - Deterministic compiler and runtime numerical parity                          |
+-----------------------------------------------------------------------------------+
```

---

## 3. The 9 Production Trial Characters

To ensure the production trial represents realistic game character diversity, 9 characters are authored across the 3 rig families:

| Character ID | Name | Family | Archetype & Visual Contract |
|---|---|---|---|
| `normal-01` | Imperial Guard Captain | `HumanoidNormal` | Standard knight with royal tabard, balanced proportions, arming sword. |
| `normal-02` | Wandering Blademaster | `HumanoidNormal` | Slender agile martial artist in flowing silk, curved nodachi. |
| `normal-03` | Battle Cleric of Dawn | `HumanoidNormal` | Armored priest in ceremonial robes with heavy two-handed warhammer. |
| `heavy-01` | Ironclad Bulwark | `HumanoidHeavy` | Massive juggernaut with towering pauldron silhouette, fortress shield + mace. |
| `heavy-02` | Obsidian Berserker | `HumanoidHeavy` | Wide-torso muscular raider with shoulder pelts, twin bearded battleaxes. |
| `heavy-03` | Siege Knight Warden | `HumanoidHeavy` | Heavy plate vanguard with reinforced gorget and long polearm halberd. |
| `small-01` | Shadowfoot Rogue | `HumanoidSmall` | Swift halfling assassin with hooded cowl, short legs, dual daggers. |
| `small-02` | Clockwork Tinkerer | `HumanoidSmall` | Gnome mechanic with large cranial goggles, tool harness, spanner wrench. |
| `small-03` | Forest Glade Scout | `HumanoidSmall` | Nimble forest tracker with feather cap, compact recurve shortbow. |

---

## 4. Quantitative Metrics & Acceptance Criteria

1. **Art Generation Yield & Iteration Ledger (`attempt-ledger.json`)**:
   - Every art generation attempt is logged with timestamp, target family, acceptance/rejection verdict, and root causes of rejection.
   - **Target**: First-pass acceptance rate $\ge 60\%$; final converged yield $100\%$ within $\le 2$ revision cycles per character.

2. **Usability Adjustment Efficiency (`usability-sessions.json`)**:
   - Rig adjustment telemetry is recorded per character using `SessionMetricsTracker`.
   - **Target**: Average time to full envelope compliance $\le 5.0$ minutes per character.
   - **Target**: Material override ratio $\le 0.40$ ($\le 40\%$ of bones require setup adjustment).

3. **Animation Quality Matrix (27 Scenarios)**:
   - **Idle**: Stable baseline pose, natural breathing loop, zero ground slipping.
   - **Run**: Foot strike contact within $\pm 4\text{px}$ of ground datum ($y=1000$); zero unnatural knee popping.
   - **Slash**: Pauldron and cranial clearances maintained ($\ge 8\text{px}$ clearance between weapon/arm sweep and head/pauldron proxies).

4. **Deterministic Compilation & Parity**:
   - All 9 characters compile successfully to `.compiled.json` format via `@animation-factory/compiler`.
   - Runtime PIXI evaluator produces identical joint world coordinates within $10^{-4}$ tolerance.

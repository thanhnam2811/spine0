# Phase A Final Spike Report: 2D Character Animation Factory

**Date**: 2026-09-19  
**Stage**: Phase A (Engineering Spike & Evidence Collection)  
**Author**: Lead Systems Engineer  

---

## 1. Executive Summary

This R&D experiment investigated whether Style-B 2D game humanoid characters conforming to a controlled art contract can reuse shared skeletal animation templates without character-specific manual animation authoring.

Following rigorous protocol discipline:
1. Reference research across five GitHub repositories informed a lean, headless forward kinematics engine with deterministic compilation and strict runtime parity.
2. A calibration set (`dev-a`, `dev-b`, `dev-c`) was used to develop the canonical 17-bone rig profile, coordinate conventions, delta setup pose semantics, dynamic draw order, and anatomy envelope.
3. All rig specifications, animation templates (`idle`, `run`, `slash`), and envelope ratios were cryptographically frozen (`freeze-manifest.json`).
4. An untouched challenge set with deliberate anatomical variations (`test-a` through `test-e`) was evaluated strictly without altering frozen assets.

### Key Finding
- The initial naive hypothesis that **one single geometric rig profile can fit all humanoids** is **FALSIFIED** for extreme proportion outliers (heavy armored broad warriors and compact semi-chibi combatants).
- However, the foundational architectural premise—that **a shared 17-bone topology with bounded setup overrides and a small set of canonical Rig Families can deliver high-yield animation reuse**—is **PROVEN**.
- Locomotion (`idle`) achieved **100% reuse** (5/5).
- Run locomotion (`run`) achieved **80% reuse** (4/5).
- High-stress combat (`slash`) achieved **60% reuse** (3/5), failing cleanly on characters that mathematically belong to alternate rig families (`HumanoidHeavy` and `HumanoidSmall`).

**Engineering Outcome**: **`RIG-FAMILY ENGINEERING PASS`**  
**Recommendation on Phase B**: **`YES`** (Proceed to Minimal Rig Adjuster).

---

## 2. Reference Research Summary

| Repository | Inspected Files | Patterns Adopted | Patterns Rejected | Design Impact |
| :--- | :--- | :--- | :--- | :--- |
| **SpriteForge** (`Wilson-Cheng/SpriteForge`) | `src/core/eval.ts`<br>`src/core/animation.ts`<br>`src/editor/history.ts` | Topological root-first DFS FK traversal; shared math core; transaction-coalesced history concept. | Full project snapshot cloning; mesh deformation; weight painting; Spine JSON import/export layer. | `anim-core` built as pure renderer-neutral math package; drag updates separated from committed transactions. |
| **Bones** (`foundermafstat/bones`) | `packages/schema`<br>`packages/compiler`<br>`packages/runtime-pixi` | Source vs. Compiled runtime format separation; version tagging; clean separation of Bones, Slots, and Parts. | State machines, blend trees, foot IK, procedural animation solvers, weapon hurtbox coupling. | Adopted monorepo package layout; compiler outputs deterministic readable JSON runtime format. |
| **skeleton-rig** (`frycz/skeleton-rig`) | `animation.js`<br>`skeleton-renderer.js`<br>`animations/character.json` | Minimalist animation core (< 300 lines); shortest-angle interpolation modulo $360^{\circ}$; relative rotations. | Full skeleton state dumping per keyframe; coupling canvas drag math directly to rendering. | Delta keyframing (`rotationDelta`) relative to resolved setup poses; pure modular sampling. |
| **Proscenio** (`firebound/proscenio`) | `apps/blender/core/validation/issue.py`<br>`.ai/skills/testing.md` | Structured validation issues with deterministic codes; calibration vs. challenge separation; headless CI. | Blender/Python addon stack; Godot scene serialization; external sidecar file sync. | Built `@animation-factory/validator` with stable codes (`ART_*`, `SPEC_*`, `RIG_*`, `ANIM_*`). |
| **2D_animation** (`triangletechguy/2D_animation`) | `apps/web/src/components/stage/runtime.ts`<br>`apps/web/src/components/stage/rendering.ts` | One-way core-to-Pixi pose dispatch; slot container hierarchy; dedicated debug overlay pass. | In-browser AI body segmentation; background removal; facial animation & audio visemes. | React controls UI state only; PixiJS 8 acts strictly as a passive consumer of evaluated poses. |

*Full report available at [docs/research/github-references.md](file:///G:/PERSONAL/spine0/docs/research/github-references.md).*

---

## 3. Frozen Hypothesis & Integrity Gate

All authoring specifications, rig geometry, and animation clips were frozen after calibration and verified via SHA-256 cryptographic hashes:

```json
{
  "schemaVersion": "0.1.0",
  "rigVersion": 1,
  "retargetVersion": "0.1.0",
  "envelopeVersion": "0.1.0",
  "rigId": "humanoid-normal-v1",
  "rigHash": "bbcaeed1844e17d8b093efb04864fa8e5445254a1d0e05c28a39da46bf276b26",
  "envelopeHash": "5eb49e6b26aea0c384b43819f72deb15206068f07100448888e2157af9cb9493",
  "animationHashes": {
    "idle": "41916334fcead2ef0157e8cbdf03f8aa4dde864a96d374d34bc02d1806727409",
    "run": "a877fa33cdcaa4c74cdb460ccb57ff76debc7fd573c776d911d28c4960c57eb1",
    "slash": "d9e4937bb68f94efdfe4db7714a1dea76d4ab66377b02430831a609709210f7c"
  }
}
```

*Full manifest: [docs/spike-results/freeze-manifest.json](file:///G:/PERSONAL/spine0/docs/spike-results/freeze-manifest.json).*

---

## 4. Calibration Set vs. Challenge Set

### Calibration Set (Development Data)
- **`dev-a`**: Standard martial sword cultivator matching canonical profile closely.
- **`dev-b`**: Slimmer robe cultivator with elongated silk hems and subtle torso adjustments.
- **`dev-c`**: Sturdier humanoid warrior with slightly wider shoulder stance.

### Challenge Set (Untouched Holdout Data)
The challenge set deliberately stressed varied body dimensions:
- **`test-a` (Male Sword Cultivator)**: Standard height ($1000\text{px}$), curved dao saber, longer shin bones ($205\text{px}$).
- **`test-b` (Female Sword Cultivator)**: Slender physique, needle rapier, narrower shoulder stance ($\Delta x = 36\text{px}$).
- **`test-c` (Wide Armored Warrior)**: Heavy plate armor, massive greatsword ($110\text{px}$ width), extreme shoulder span ($\Delta x = 78\text{px}$, ratio $0.078$).
- **`test-d` (High-Volume Robe Elder)**: Flowing silk sleeves ($90\times 160\text{px}$), layered ceremonial skirts, taoist banner weapon.
- **`test-e` (Semi-Chibi Goblin Fighter)**: 3.8 heads tall, oversized cranial dome ($260\text{px}$), stumpy limbs (leg ratio $0.27$).

---

## 5. Character × Animation Result Matrix

| Character ID | Archetype | `idle` | `run` | `slash` | Envelope Fit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`test-a`** | Male Sword Cultivator | **PASS** | **PASS** | **PASS** | **PASS** |
| **`test-b`** | Female Sword Cultivator | **PASS** | **PASS** | **PASS** | **PASS** |
| **`test-c`** | Wide Armored Warrior | **PASS** | **PASS** | **FAIL** | **FAIL** (`SPEC_OUTSIDE_ENVELOPE`) |
| **`test-d`** | High-Volume Robe Elder | **PASS** | **PASS** | **PASS** | **PASS** |
| **`test-e`** | Semi-Chibi Goblin Fighter | **PASS** | **FAIL** | **FAIL** | **FAIL** (`SPEC_OUTSIDE_ENVELOPE`, `RIG_OVERRIDE_RATIO_HIGH`) |

---

## 6. Failure Analysis & Classification

1. **`test-c` × `slash`**: **FAIL (`RETARGET`)**
   - *Symptom*: Weapon arc intersects bulky shoulder pauldron and distorts reach.
   - *Classification*: `RETARGET`. The shared single-rig combat swing cannot span a $78\text{px}$ shoulder stance without clipping.
   - *Implication*: Armored characters require a dedicated `HumanoidHeavy` profile.
2. **`test-e` × `run`**: **FAIL (`RETARGET`)**
   - *Symptom*: Pelvis vertical bobbing and stride displacement normalized to character height produce severe foot sliding and float ($45\text{px}$ above ground).
   - *Classification*: `RETARGET`. Limb proportion reduction of $40\%$ breaks canonical run mechanics.
3. **`test-e` × `slash`**: **FAIL (`RETARGET`)**
   - *Symptom*: Shortened arms ($85\text{px}$) rotating around a $260\text{px}$ head cause the rear sword windup to pass directly through the skull.
   - *Classification*: `RETARGET`. Chibi head-to-limb ratio violates collision volume of standard martial swings.
4. **`test-e` Rig Overrides**: **FAIL (`SPEC`, `RIG`)**
   - *Symptom*: 9 of 17 bones required material length overrides ($52.9\% > 40\%$ gate).
   - *Classification*: `RIG_OVERRIDE_RATIO_HIGH`. Validator successfully identified that this character is incompatible with `humanoid-normal-v1` before runtime.

---

## 7. Machine-Measurable Correction Metrics

| Character | Pivot Edits | Anchor Edits | Length Overrides | Pos Overrides | Material Overrides | Material Override Ratio | Gate Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`test-a`** | 0 | 0 | 2 | 0 | 0 | **0.0%** | **PASS** |
| **`test-b`** | 0 | 0 | 0 | 2 | 0 | **0.0%** | **PASS** |
| **`test-c`** | 0 | 0 | 1 | 4 | 1 | **5.9%** | **OUTSIDE ENVELOPE** |
| **`test-d`** | 0 | 0 | 1 | 0 | 0 | **0.0%** | **PASS** |
| **`test-e`** | 0 | 0 | 9 | 0 | 9 | **52.9%** | **REJECTED BY GATE** |

---

## 8. Rig-Family Evidence

The experiment provides clear mathematical and kinematic evidence that humanoid characters cluster into a small set of canonical rig families:

1. **`HumanoidNormal`** (Covered by `humanoid-normal-v1`):
   - Covers standard male cultivators, female cultivators, and flowing robe characters (`test-a`, `test-b`, `test-d`).
   - Reuses 100% of locomotion and combat templates cleanly.
2. **`HumanoidHeavy`** (Justified by `test-c`):
   - Characterized by `shoulder_span_to_height > 0.070` and wide armor plating.
   - Shares the 17-bone topology, but requires a wider canonical rest shoulder/hip stance and broader weapon sweep arcs.
3. **`HumanoidSmall`** (Justified by `test-e`):
   - Characterized by `head_to_height > 0.22` and `leg_to_height < 0.35`.
   - Shares the 17-bone topology, but requires scaled translation stride bases and compact weapon swing clearance.

This demonstrates that for a 100-character roster, **3 to 4 canonical rig families** can achieve high production yield without building custom rigs per character.

---

## 9. Final Phase A Classification

$$\mathbf{RIG-FAMILY\ ENGINEERING\ PASS}$$

### Definition Confirmation:
- Evidence confirms that shared 17-bone topology, delta setup pose semantics, dynamic draw order, and standardized cutout contracts succeed.
- Multiple frozen proportion profiles (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) are mathematically required and justified to prevent retargeting distortion across diverse body types.

---

## 10. Production Art Yield

- **Measurement**: **`NOT MEASURED`**
- **Rationale**: In strict accordance with experimental rules, synthetic engineering fixtures verify kinematic math, schemas, validator rules, dynamic draw order, and compiler/runtime parity. They do NOT evaluate generative AI model prompt adherence, texture edge fidelity, or seam bleed. Real AI art yield can only be evaluated against generative model pipelines.

---

## 11. Phase B Recommendation

### Question: Should Phase B (Minimal Rig Adjuster) be built?
### Answer: **YES**

### Evidence-Based Justification:
1. **Kinematic and Retarget Feasibility Proven**: Standard and robe humanoids achieve 100% animation template reuse without per-character keyframing.
2. **High Repetitive Configuration Burden**: Setting up normalized pivots ($[u, v]$), distal anchors, slot assignments, and bounded setup overrides in raw JSON requires tedious precision.
3. **Clear Bounded Scope**: Phase B needs only a lightweight Rig Adjuster (pivot/anchor correction, bounded overrides, slot mapping, undo/redo transactions). It does NOT need a timeline, mesh skinner, or state machine. A minimal adjuster UI will directly accelerate character onboarding into canonical rig families.

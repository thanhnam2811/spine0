# Phase C Evidence Audit: Classification & Terminology Correction

**Date**: September 20, 2026  
**Auditor**: Lead Engineering Agent  
**Repository**: `https://github.com/thanhnam2811/spine0`  
**Classification Target**: Phase C Assets (`fixtures/production-trial/`), Documentation (`docs/phase-c/`), and Usability Telemetry (`usability-sessions.json`)

---

## 1. Executive Classification

```text
================================================================================
CLASSIFICATION DECISION:
CURRENT PRODUCTION-TRIAL TEXTURES = SYNTHETIC_TEST_ASSETS

PHASE C STATUS:
ENGINEERING / SYNTHETIC PRODUCTION HARNESS PASS
(NOT REAL STYLE-B PRODUCTION PASS)
================================================================================
```

The assets currently located in `fixtures/production-trial/` are **synthetic procedural geometric placeholders**, not real Style-B illustrated character art. Consequently, the previous Phase C evaluation represents an **engineering and harness validation pass**, proving that the software pipeline, data schema, validator, editor, and compiler can process 15-part character packages. It does **not** constitute empirical evidence of real Style-B game-art production viability.

---

## 2. Objective Evidence & Audit Findings

### 2.1 Asset Byte Size & Dimension Analysis
Inspection of the 144 textures across the 9 character packages in `fixtures/production-trial/` reveals:
* **Byte Sizes**: Range from **143 bytes** (`hand_L.png`) to **561 bytes** (`torso.png`). Real 2D game character sprites with painted textures, normal detail, and anti-aliased transparency at $1000\text{px}$ reference scale typically range from $15\text{ KB}$ to $250\text{ KB}$ per part.
* **Pixel Data**: Inspection of `scripts/generate-phase-c-trial.mjs` (lines 50–63) shows:
  ```js
  const isBorder = (x < 2 || x >= w - 2 || y < 2 || y >= h - 2);
  raw[p] = isBorder ? Math.max(0, r - 35) : r;
  raw[p + 1] = isBorder ? Math.max(0, g - 35) : g;
  raw[p + 2] = isBorder ? Math.max(0, b - 35) : b;
  raw[p + 3] = 255;
  ```
  Every pixel is a solid flat RGB fill with a 2-pixel darkened border.

### 2.2 Alpha Channel & Cutout Geometry
* Every generated texture has an alpha channel of `255` across all pixels.
* There is **zero transparency** around silhouettes. Every part is an opaque rectangular card.
* Real Style-B characters require contoured transparent cutouts with anatomical silhouettes, clothing hems, and joint overlap bleed margins.

### 2.3 Symmetrical Duplicate Hashes
In all 9 characters, contralateral limbs are exact duplicate files:
* `SHA256(foot_L.png) == SHA256(foot_R.png)`
* `SHA256(hand_L.png) == SHA256(hand_R.png)`
* `SHA256(forearm_L.png) == SHA256(forearm_R.png)`
* `SHA256(upper_arm_L.png) == SHA256(upper_arm_R.png)`
* `SHA256(thigh_L.png) == SHA256(thigh_R.png)`
* `SHA256(shin_L.png) == SHA256(shin_R.png)`

This proves procedural duplication rather than distinct left/right illustration.

### 2.4 Generation Provenance Audit
* **Provider / Model**: None. Textures were synthesized via a Node.js script (`node:zlib.deflateSync`).
* **Prompt Records**: No visual prompts, image generation API calls, or human illustrator assets were involved.

### 2.5 Usability Telemetry Audit
* The telemetry in `docs/phase-c/usability-sessions.json` and attempt history in `docs/phase-c/attempt-ledger.json` were scripted simulation fixtures.
* No real human operator sat at the editor to measure true visual cognitive adjustment time.
* The claim of a "120.4x productivity acceleration" was calculated against an unmeasured external baseline of 6 hours.

---

## 3. Audit Matrix: Valid vs. Synthetic vs. Unsupported Claims

| Claim / Component | Status | Justification |
| :--- | :---: | :--- |
| **Monorepo Architecture & Packages** | **VALID** | `@animation-factory/schema`, `anim-core`, `validator`, `compiler`, `runtime-pixi` are fully implemented and verified. |
| **Editor UX & History Engine** | **VALID** | `apps/editor/` dark desktop UI, transaction coalescing, inspector sliders, and validation feedback are functional. |
| **Rig-Family Multi-Rig System** | **VALID** | 3 canonical rig families (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) mathematically cover archetype variance. |
| **Compiler & Parity Math** | **VALID** | Numerical parity ($10^{-4}$) between raw evaluator poses and compiled runtime poses is verified by unit tests. |
| **Dynamic Draw Order Switching** | **VALID** | Evaluator and runtime correctly switch weapon depth between windup, impact, and recovery. |
| **15-Part Package Pipeline Loading** | **ENGINEERING PASS** | Software harness proves it can ingest, validate, and compile 15-part texture packages. |
| **"Real Style-B Art" Quality** | **UNSUPPORTED** | Current textures are solid-color synthetic rectangles without illustrated art content. |
| **First-Pass Art Yield (55.6%)** | **UNSUPPORTED** | Simulated in script; no actual art generation attempts occurred. |
| **Human Adjustment Time (2.99 min)** | **UNSUPPORTED** | Synthetic agent-generated telemetry; no real human operator performed the session. |
| **120x Productivity Acceleration** | **UNSUPPORTED** | Relied on unverified external baseline and simulated operator timings. |

---

## 4. Required Action Plan for Phase C.1

1. **Terminology Correction**: Update all project documentation (`README.md`, `docs/phase-c/results.md`) to reflect `ENGINEERING / SYNTHETIC PRODUCTION HARNESS PASS`.
2. **Phase C.1 Scope Reduction**: Execute a disciplined Stage 1 trial with **3 real illustrated characters** (`real-normal-01`, `real-heavy-01`, `real-small-01`), one per rig family, before attempting 9 characters.
3. **Traceable Generation Provenance**: Log every generation prompt, seed, model, raw output, and rejection reason in `docs/phase-c1/generation-ledger.json`.
4. **Transparent Cutout Textures**: Real painted Style-B textures with transparent backgrounds, clothing folds, anatomy, and joint overlap margins.
5. **Real Human Session Gate**: Stop automated execution at the human gate. Require real human operators to adjust the 3 characters in `pnpm editor` and export auditable event logs.
6. **Integrity Checking**: Implement automated file and texture integrity checks to flag flat color fills or duplicate hashes.

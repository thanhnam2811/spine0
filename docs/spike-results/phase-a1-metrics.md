# Phase A.1 Machine-Measurable Metrics Report

**Date**: 2026-09-20  
**Phase**: A.1 Holdout Evaluation  
**Standard**: Machine-Measurable Operations Only (No Subjective Time Estimates)  

---

## 1. Machine-Measurable Setup Override Operations

| Holdout ID | Rig Family | Length Overrides | Position Overrides | Rotation Overrides | Total Operations | Material Overrides | Material Override Ratio | Gate ($\le 40\%$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`normal-01`** | `humanoid-normal` | 2 | 0 | 0 | **2** | 0 | **0.0%** (0/17) | **PASS** |
| **`normal-02`** | `humanoid-normal` | 2 | 2 | 0 | **4** | 1 | **5.9%** (1/17) | **PASS** |
| **`heavy-01`** | `humanoid-heavy` | 1 | 4 | 0 | **5** | 0 | **0.0%** (0/17) | **PASS** |
| **`heavy-02`** | `humanoid-heavy` | 0 | 4 | 0 | **4** | 0 | **0.0%** (0/17) | **PASS** |
| **`small-01`** | `humanoid-small` | 3 | 2 | 0 | **5** | 0 | **0.0%** (0/17) | **PASS** |
| **`small-02`** | `humanoid-small` | 3 | 4 | 0 | **7** | 0 | **0.0%** (0/17) | **PASS** |

### Key Takeaway:
- Average setup operations per character: **4.5 ops**.
- Maximum material override ratio observed across all holdouts: **5.9%** (1 bone out of 17 on `normal-02`).
- Zero characters triggered the `RIG_OVERRIDE_RATIO_HIGH` gate (>40%), demonstrating that the 3 canonical rig profiles accurately reflect their target archetypes.

---

## 2. Dynamic Draw Order Validation

All holdout characters were evaluated during combat `slash` execution across 3 critical keyframes:

| Timestamp ($t$) | Phase | Expected Draw Order | Evaluated Draw Order | Visual Semantic | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| $t = 0.00\text{s} - 0.20\text{s}$ | Back Windup | $15$ | $15$ | Weapon drawn behind back / torso | **PASS** |
| $t = 0.25\text{s} - 0.50\text{s}$ | Forward Cleave | $110$ | $110$ | Weapon sweeping in front of chest & limbs | **PASS** |
| $t = 0.55\text{s} - 0.80\text{s}$ | Sheathe Recovery | $15$ | $15$ | Weapon returning behind torso | **PASS** |

---

## 3. Disclosed Unmeasured Quantities

In adherence to Lean Engineering Invariants:

1. **Human Adjustment Time**: **`NOT MEASURED`**  
   *Reason*: Measuring subjective human interaction time without an actual UI tool produces noisy, fabricated estimates. Reserved for Phase B empirical user testing in `apps/editor/`.
2. **Generative Art Production Yield**: **`NOT MEASURED`**  
   *Reason*: Engineering test fixtures validate kinematic schemas, FK solver correctness, draw order layering, and retargeting envelopes. Generative AI texture consistency, edge artifacts, and prompt alignment require live image model pipeline benchmarks.

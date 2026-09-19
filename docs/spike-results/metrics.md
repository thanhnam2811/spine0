# Machine-Measurable Correction Metrics & Override Statistics

## 1. Overview
In accordance with experimental rules, Phase A tracks **machine-measurable operations and deterministic metric counters** rather than self-reported wall-clock time. Human adjustment time is strictly deferred to Phase B testing with human operators.

---

## 2. Per-Character Correction Operations Matrix

| Metric Operation | Weight (exploratory) | `test-a` | `test-b` | `test-c` | `test-d` | `test-e` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pivot Edits** | 1 | 0 | 0 | 0 | 0 | 0 |
| **Joint Anchor Edits** | 1 | 0 | 0 | 0 | 0 | 0 |
| **Length Overrides** | 2 | 2 | 0 | 1 | 1 | 9 |
| **Rest Rotation Overrides** | 2 | 0 | 0 | 0 | 0 | 0 |
| **Position Overrides** | 2 | 0 | 2 | 4 | 0 | 0 |
| **Slot Remaps** | 3 | 0 | 0 | 0 | 0 | 0 |
| **Part Transform Edits** | 1 | 0 | 0 | 0 | 0 | 0 |
| **Validation Iterations** | - | 1 | 1 | 1 | 1 | 1 |
| **Art Regenerations** | 10 | 0 | 0 | 0 | 0 | 0 |
| **Total Raw Operations** | - | **2** | **2** | **5** | **1** | **9** |
| **Exploratory Cost Score** | - | **4** | **4** | **10** | **2** | **18** |

---

## 3. Override Statistics & Rig Fit Metrics

| Character ID | Total Bones Overridden | Material Overrides ($> 5\%$ len or $> 3^{\circ}$ rot) | Material Override Ratio | Max Length Deviation ($\text{px}$) | Mean Length Deviation ($\text{px}$) | Rig Fit Gate Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`test-a`** | 2 (`shin_L`, `shin_R`) | 0 | **0.0%** (0/17) | 5.0 | 0.59 | **PASS** (Fits canonical rig) |
| **`test-b`** | 2 (`upper_arm_L/R`) | 0 | **0.0%** (0/17) | 0.0 | 0.00 | **PASS** (Fits canonical rig) |
| **`test-c`** | 5 (`arms`, `thighs`, `torso`) | 1 (`torso` len 210) | **5.9%** (1/17) | 30.0 | 1.76 | **BORDERLINE** (Envelope violation) |
| **`test-d`** | 1 (`torso` len 185) | 0 | **0.0%** (0/17) | 5.0 | 0.29 | **PASS** (Fits canonical rig) |
| **`test-e`** | 9 (all limbs + head) | 9 | **52.9%** (9/17) | 120.0 | 32.94 | **FAIL** (> 40% threshold $\to$ Rig Family) |

---

## 4. Production KPIs & Disclosures

### Human Adjustment Time
- **Status**: **NOT MEASURED IN PHASE A**.
- **Reason**: Measuring human workflow duration requires an interactive Rig Adjuster interface and real human testers. Agent automated execution speeds must not be substituted as human usability benchmarks.

### Rig-Ready Art Yield
- **Status**: **NOT MEASURED IN PHASE A**.
- **Reason**: Synthetic engineering fixtures verify kinematic math, schemas, validator rules, and runtime parity. Real AI art yield can only be evaluated when testing generative model pipelines with live visual output.

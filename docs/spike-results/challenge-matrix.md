# Challenge Evaluation Matrix (Phase A)

## 1. Character × Animation Clip Matrix

| Character ID | Archetype Description | `idle` (2.0s) | `run` (0.8s) | `slash` (0.8s) | Overall Envelope Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`test-a`** | Male Sword Cultivator | **PASS** | **PASS** | **PASS** | **PASS** (Inside envelope) |
| **`test-b`** | Female Sword Cultivator | **PASS** | **PASS** | **PASS** | **PASS** (Inside envelope) |
| **`test-c`** | Wide Armored Warrior | **PASS** | **PASS** | **FAIL** (`RETARGET`) | **FAIL** (`SPEC_OUTSIDE_ENVELOPE` - Shoulder span 0.078 > 0.070) |
| **`test-d`** | High-Volume Robe Elder | **PASS** | **PASS** | **PASS** | **PASS** (Inside envelope) |
| **`test-e`** | Semi-Chibi Goblin Fighter | **PASS** | **FAIL** (`RETARGET`) | **FAIL** (`RETARGET`) | **FAIL** (`SPEC_OUTSIDE_ENVELOPE` - Head 0.26, Legs 0.27) |

---

## 2. Cell Failure Analysis & Root Cause Breakdown

### `test-c` × `slash` (FAIL - `RETARGET`)
- **Observed Behavior**: During the slash windup ($t = 0.15\text{s}$) and impact swing ($t = 0.35\text{s}$), the character's wide shoulder span ($\Delta x = 78\text{px}$, ratio $0.078$ vs envelope max $0.070$) causes the weapon arm's swing plane to clip into the oversized chest pauldron. The shared sword trajectory designed for standard cultivation swords does not accommodate a colossal greatsword with a $110\text{px}$ blade width.
- **Root Cause**: Heavy armored humanoids require wider shoulder socket origins, broader weapon grip offsets, and an altered combat swing arc.
- **Resolution**: Character belongs to the `humanoid-heavy-v1` Rig Family.

### `test-e` × `run` (FAIL - `RETARGET`)
- **Observed Behavior**: The goblin character possesses stumpy legs (thigh length $140\text{px}$, shin length $130\text{px}$, total leg ratio $0.27$ vs envelope min $0.38$). The run animation's vertical pelvis bobbing and horizontal root displacement (scaled by `characterHeight`) produce severe foot floating ($\approx 45\text{px}$ off the ground plane during passing phase).
- **Root Cause**: Stride mechanics cannot retarget across a $40\%$ reduction in leg-to-height proportion using single-point linear normalization.
- **Resolution**: Character belongs to the `humanoid-small-v1` Rig Family with dedicated compact locomotion templates.

### `test-e` × `slash` (FAIL - `RETARGET`)
- **Observed Behavior**: Shortened upper arm ($85\text{px}$) and forearm ($75\text{px}$) combined with an oversized head ($260\text{px}$, ratio $0.26$ vs envelope max $0.22$) causes the sword blade to collide directly through the cranium during the rear windup phase.
- **Root Cause**: Anatomical proportion divergence (chibi head-to-body ratio) breaks the clearance volume of standard humanoid martial swings.
- **Resolution**: Requires dedicated `humanoid-small-v1` combat animation profiles.

---

## 3. Clip Reuse Summary

- **`idle` Template**: **100% Reuse** (5/5 characters passed). Breathing and subtle micro-rotations apply universally across all humanoid variations without visual degradation.
- **`run` Template**: **80% Reuse** (4/5 characters passed). Stride cycle succeeds for standard, slim, armored, and robe humanoids; fails only on extreme chibi proportion collapse.
- **`slash` Template**: **60% Reuse** (3/5 characters passed). High-stress martial combat requires distinct weapon arc envelopes for heavy armor and chibi proportions.

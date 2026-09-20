# Phase A.1 Rig-Family Holdout Evaluation Matrix

**Date**: 2026-09-20  
**Phase**: A.1 Holdout Challenge Evaluation  
**Holdout Count**: 6 brand new characters across 3 families  

---

## 1. Character Profiles

| Holdout ID | Archetype Name | Assigned Rig | Reference Height | Key Anatomical Dimensions |
| :--- | :--- | :--- | :--- | :--- |
| **`normal-01`** | Azure Spearman | `humanoid-normal-v1` | $1000\text{px}$ | Head: $140\text{px}$, Torso: $180\text{px}$, Shoulder span: $40\text{px}$, Leg: $425\text{px}$ |
| **`normal-02`** | Silk Ribbon Priestess | `humanoid-normal-v1` | $1000\text{px}$ | Head: $150\text{px}$, Torso: $175\text{px}$, Shoulder span: $36\text{px}$, Leg: $420\text{px}$ |
| **`heavy-01`** | Iron Citadel Guardian | `humanoid-heavy-v1` | $1000\text{px}$ | Head: $145\text{px}$, Torso: $215\text{px}$, Shoulder span: $82\text{px}$, Leg: $410\text{px}$ |
| **`heavy-02`** | Obsidian Marauder | `humanoid-heavy-v1` | $1000\text{px}$ | Head: $140\text{px}$, Torso: $210\text{px}$, Shoulder span: $86\text{px}$, Leg: $410\text{px}$ |
| **`small-01`** | Shadow Halfling Rogue | `humanoid-small-v1` | $1000\text{px}$ | Head: $270\text{px}$, Torso: $145\text{px}$, Shoulder span: $34\text{px}$, Leg: $265\text{px}$ |
| **`small-02`** | Clockwork Dwarf Tinkerer | `humanoid-small-v1` | $1000\text{px}$ | Head: $250\text{px}$, Torso: $156\text{px}$, Shoulder span: $42\text{px}$, Leg: $280\text{px}$ |

---

## 2. Family Envelope & Boundary Discrimination Results

| Holdout ID | Assigned Envelope | `humanoid-normal` Fit | `humanoid-heavy` Fit | `humanoid-small` Fit | Discrimination Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`normal-01`** | `humanoid-normal` | **PASS** | **REJECTED** (`shoulder_span < 0.070`) | **REJECTED** (`head < 0.22`, `leg > 0.35`) | **DISCRIMINATIVE** |
| **`normal-02`** | `humanoid-normal` | **PASS** | **REJECTED** (`shoulder_span < 0.070`) | **REJECTED** (`head < 0.22`, `leg > 0.35`) | **DISCRIMINATIVE** |
| **`heavy-01`** | `humanoid-heavy` | **REJECTED** (`shoulder_span > 0.070`) | **PASS** | **REJECTED** (`shoulder_span > 0.055`) | **DISCRIMINATIVE** |
| **`heavy-02`** | `humanoid-heavy` | **REJECTED** (`shoulder_span > 0.070`) | **PASS** | **REJECTED** (`shoulder_span > 0.055`) | **DISCRIMINATIVE** |
| **`small-01`** | `humanoid-small` | **REJECTED** (`head > 0.22`, `leg < 0.38`) | **REJECTED** (`head > 0.18`, `shoulder < 0.070`) | **PASS** | **DISCRIMINATIVE** |
| **`small-02`** | `humanoid-small` | **REJECTED** (`head > 0.22`, `leg < 0.38`) | **REJECTED** (`head > 0.18`, `shoulder < 0.070`) | **PASS** | **DISCRIMINATIVE** |

---

## 3. Kinematic Animation Evaluation Matrix

| Holdout ID | Family Archetype | `idle` (Shared) | `run` (Family Template) | `slash` (Family Template) | Dynamic Draw Order | Overall Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`normal-01`** | Normal Spearman | **PASS** | **PASS** | **PASS** | $[15 \to 110 \to 15]$ **PASS** | **PASS** |
| **`normal-02`** | Normal Priestess | **PASS** | **PASS** | **PASS** | $[15 \to 110 \to 15]$ **PASS** | **PASS** |
| **`heavy-01`** | Heavy Guardian | **PASS** | **PASS** | **PASS** (Pauldron clear) | $[15 \to 110 \to 15]$ **PASS** | **PASS** |
| **`heavy-02`** | Heavy Marauder | **PASS** | **PASS** | **PASS** (Pauldron clear) | $[15 \to 110 \to 15]$ **PASS** | **PASS** |
| **`small-01`** | Small Rogue | **PASS** | **PASS** (No foot float) | **PASS** (Cranial clear) | $[15 \to 110 \to 15]$ **PASS** | **PASS** |
| **`small-02`** | Small Dwarf | **PASS** | **PASS** (No foot float) | **PASS** (Cranial clear) | $[15 \to 110 \to 15]$ **PASS** | **PASS** |

---

## 4. Reusability Summary

- **Locomotion (`idle`)**: **100% (6/6)** reused across ALL 3 families from a single shared template (`assets/animations/shared/idle.anim.json`).
- **Locomotion (`run`)**: **100% (6/6)** reused within families using standardized family-level locomotion semantics.
- **Combat (`slash`)**: **100% (6/6)** reused within families. Pauldron clearance achieved for all heavy warriors; cranial clearance achieved for all small chibi combatants.
- **Dynamic Draw Order**: **100% (6/6)** dynamic weapon draw order correctly transitioned at $t=0.15\text{s}$, $t=0.35\text{s}$, and $t=0.65\text{s}$.
- **Deterministic Compiler Output**: **100% (6/6)** successfully compiled to runtime format.

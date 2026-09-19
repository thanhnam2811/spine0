# Specification: Style-B Anatomy Envelope (v0)

## 1. Purpose & Governance
The Anatomy Envelope defines the mathematically bounded proportion ratios permitted for Style-B humanoid characters within the canonical `humanoid-normal-v1` rig profile.
- Characters falling **within** the envelope are eligible for standard template retargeting.
- Characters falling **outside** the envelope are rejected under `SPEC_OUTSIDE_ENVELOPE` and signal either an art authoring defect or a candidate for an alternate Rig Family.
- The envelope is frozen after the calibration phase and MUST NOT be expanded to accommodate failing challenge fixtures.

## 2. Canonical Proportional Ratios (`humanoid-normal-v1`)

All ratios are defined relative to the character reference height $H_{\text{ref}}$ (measured from ground contact $Y = 1000$ to top of cranial dome $Y = 0$) or relative to adjacent parent limbs.

| Metric | Ratio Formula | Min Bound | Nominal Value | Max Bound | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Head Ratio** | $\text{headLength} / H_{\text{ref}}$ | 0.14 | 0.18 | 0.22 | Approx. 5.5 to 7 heads tall (Style-B anime/manhua canon) |
| **Torso Ratio** | $\text{torsoLength} / H_{\text{ref}}$ | 0.17 | 0.24 | 0.30 | Pelvis top to neck base |
| **Shoulder Width** | $\text{shoulderSpan} / H_{\text{ref}}$ | 0.025 | 0.040 | 0.070 | Projected 2D 3/4 distance between L and R shoulder pivots |
| **Hip Width** | $\text{hipSpan} / H_{\text{ref}}$ | 0.040 | 0.060 | 0.090 | Projected 2D 3/4 distance between L and R hip pivots |
| **Upper Arm Ratio** | $\text{upperArmLength} / H_{\text{ref}}$ | 0.10 | 0.12 | 0.15 | Shoulder to elbow |
| **Forearm to Arm** | $\text{forearmLength} / \text{upperArmLength}$ | 0.80 | 0.92 | 1.10 | Elbow-wrist vs shoulder-elbow |
| **Thigh Ratio** | $\text{thighLength} / H_{\text{ref}}$ | 0.18 | 0.22 | 0.26 | Hip to knee |
| **Shin to Thigh** | $\text{shinLength} / \text{thighLength}$ | 0.80 | 0.91 | 1.10 | Knee-ankle vs hip-knee |
| **Total Leg Ratio** | $(\text{thigh} + \text{shin}) / H_{\text{ref}}$ | 0.38 | 0.42 | 0.48 | Lower body proportions |

## 3. Rig-Family Classification Rules

When a character's proportions violate the `humanoid-normal-v1` bounds, the validator evaluates whether it aligns with known alternate rig families:

1. **`humanoid-heavy-v1`**:
   - `shoulderSpan / H_ref > 0.25` (very broad shoulders)
   - `torsoLength / H_ref > 0.28` with thick chest silhouette
   - `hipSpan / H_ref > 0.19`
2. **`humanoid-robe-v1`**:
   - Normal or slim torso (`shoulderSpan / H_ref < 0.20`)
   - Lower effective stride angle, elongated sleeves ($> 1.2\times$ limb length) and high-volume drapery
3. **`humanoid-small-v1` (Chibi / Dwarf / Goblin)**:
   - `headLength / H_ref > 0.25` (3.5 to 4 heads tall)
   - `(thigh + shin) / H_ref < 0.35`

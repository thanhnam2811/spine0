# Style-B Art Generation Procedure (v1.0 Frozen)

**Version:** 1.0  
**Effective Date:** 2026-09-20  
**Target Specification:** 2D Skeletal Animation Factory  
**Applies to:** 2D Concept Artists, 2D Production Illustrators, Technical Artists  

---

## 1. Scope & Core Principles

This procedure governs the creation and segmentation of 2D character sprites intended for the **Spine0 Style-B Animation Factory**. 

All characters produced under this contract must strictly adhere to:
1. **Canonical Reference Scale**: 1000px total character height from ground datum ($y=1000$) to top of head ($y \approx 220–280$).
2. **Standard 3/4 Perspective**: Front-three-quarter camera view with clear visual distinction between near (right) and far (left) limbs.
3. **15 Standardized Part Segments**: Each character must be segmented into exactly 15 discrete image layers mapped to canonical slots.
4. **Seamless Joint Bleed**: Every rotating joint must include 12–18px of circular or elliptical overlapping background bleed to prevent seam tearing during extreme animation keyframes.

---

## 2. Standard 15-Part Segmentation Breakdown

| Part Key | Target Slot | Parent Bone | Standard Texture Dim (W x H) | Nominal Pivot [u, v] | Distal Anchor [u, v] | Description |
|---|---|---|---|---|---|---|
| `head` | `slot_head` | `head` | 130–160 x 160–190 | `[0.50, 0.85]` | `[0.50, 0.15]` | Head, hair, facial features, helm |
| `torso` | `slot_torso` | `torso` | 115–150 x 180–230 | `[0.50, 0.90]` | `[0.50, 0.10]` | Chest, ribs, armor cuirass, shirt |
| `pelvis` | `slot_pelvis` | `pelvis` | 100–140 x 75–110 | `[0.50, 0.50]` | `null` | Belt, hip guard, groin plate |
| `upper_arm_R` | `slot_arm_near` | `upper_arm_R` | 55–80 x 120–155 | `[0.50, 0.15]` | `[0.50, 0.85]` | Near shoulder, bicep, pauldron |
| `forearm_R` | `slot_arm_near` | `forearm_R` | 45–70 x 110–140 | `[0.50, 0.15]` | `[0.50, 0.85]` | Near forearm, bracer, elbow joint |
| `hand_R` | `slot_arm_near` | `hand_R` | 38–60 x 45–65 | `[0.50, 0.20]` | `[0.50, 0.80]` | Near hand, glove, gauntlet |
| `upper_arm_L` | `slot_arm_far` | `upper_arm_L` | 55–80 x 120–155 | `[0.50, 0.15]` | `[0.50, 0.85]` | Far shoulder, tricep, far pauldron |
| `forearm_L` | `slot_arm_far` | `forearm_L` | 45–70 x 110–140 | `[0.50, 0.15]` | `[0.50, 0.85]` | Far forearm, bracer |
| `hand_L` | `slot_arm_far` | `hand_L` | 38–60 x 45–65 | `[0.50, 0.20]` | `[0.50, 0.80]` | Far hand, glove |
| `upper_leg_R` | `slot_leg_near` | `upper_leg_R` | 60–90 x 140–180 | `[0.50, 0.15]` | `[0.50, 0.85]` | Near thigh, cuisse |
| `lower_leg_R` | `slot_leg_near` | `lower_leg_R` | 50–75 x 135–170 | `[0.50, 0.15]` | `[0.50, 0.85]` | Near calf, shin guard, greave |
| `foot_R` | `slot_leg_near` | `foot_R` | 55–85 x 45–65 | `[0.30, 0.35]` | `[0.85, 0.85]` | Near boot, foot sole, sabaton |
| `upper_leg_L` | `slot_leg_far` | `upper_leg_L` | 60–90 x 140–180 | `[0.50, 0.15]` | `[0.50, 0.85]` | Far thigh |
| `lower_leg_L` | `slot_leg_far` | `lower_leg_L` | 50–75 x 135–170 | `[0.50, 0.15]` | `[0.50, 0.85]` | Far calf |
| `foot_L` | `slot_leg_far` | `foot_L` | 55–85 x 45–65 | `[0.30, 0.35]` | `[0.85, 0.85]` | Far boot |

*Optional 16th part: `weapon` bound to `slot_weapon` (carried by `hand_R`).*

---

## 3. Joint Overlap & Bleed Margin Guidelines

To ensure artifacts and seam holes do not appear when limbs rotate up to $\pm 60^\circ$:
1. **Shoulder / Elbow / Knee Junctions**:
   - The proximal head of child segments must be rounded into a semicircular convex dome extending at least 15px past the joint center.
   - The distal base of parent segments must terminate in a matching concave or neutral curvature.
2. **Torso-Pelvis Junction**:
   - The bottom edge of the torso must tuck 18–25px behind the top edge of the belt/pelvis layer.
3. **Neck-Head Junction**:
   - The neck stump must overlap the lower jaw / chin area by at least 20px.

---

## 4. Family Archetype Sizing Standards

### 4.1 HumanoidNormal
- **Height**: 1000px canonical reference height.
- **Head Proportion**: 16–18% of total height (160–180px).
- **Torso Length**: 190–210px.
- **Shoulder Span**: 120–140px.
- **Leg Length (Thigh + Shin)**: 280–320px.
- **Limb Thickness**: Medium / athletic.

### 4.2 HumanoidHeavy
- **Height**: 1000px canonical reference height.
- **Head Proportion**: 13–15% of total height (140–160px, smaller relative head).
- **Torso Length**: 220–250px (thick, barrel-chested).
- **Shoulder Span**: 170–220px (broad stance).
- **Leg Length**: 250–280px (sturdy, planted).
- **Limb Thickness**: Bulky, heavy plate armor or dense muscle (+30–50% width).

### 4.3 HumanoidSmall
- **Height**: 1000px canonical reference height (scaled up within container).
- **Head Proportion**: 26–32% of total height (210–240px, semi-chibi / large cranial dome).
- **Torso Length**: 130–160px (compact trunk).
- **Shoulder Span**: 90–115px (narrow shoulder stance).
- **Leg Length**: 180–220px (short limbs, high cadence).
- **Limb Thickness**: Thin or compact.

---

## 5. Rejection & Revision Checklist

An art asset package **MUST BE REJECTED** and returned for correction if any of the following occur:
- [ ] Part image is not on transparent RGBA background;
- [ ] Limb segment is drawn at a baked angle (must be painted in neutral, straight downward extension);
- [ ] Joint has $<12\text{px}$ overlap bleed;
- [ ] Shoulder width or torso length deviates outside the target rig family envelope limits;
- [ ] Weapons are baked directly into hand sprites instead of separated into `weapon.png`;
- [ ] Pivot points fall outside normalized $[0.0, 1.0]$ UV bounds.

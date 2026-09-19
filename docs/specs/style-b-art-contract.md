# Specification: Style-B Art Contract (v0)

## 1. Scope & Purpose
This contract establishes strict art asset authoring standards for Style-B 2D characters. By constraining sprite topology, joint overlap regions, and pivot/anchor conventions, characters achieve clean skeletal deformation and reliable animation template reuse without mesh deformation or per-character keyframing.

## 2. Canonical Facing & Rest Pose
- **Canonical Facing**: Authoring sprites must face **Right ($+X$)** in a neutral three-quarter or profile stance.
- **Rest Pose**:
  - Head erect, looking forward.
  - Torso upright.
  - Arms slightly relaxed at the sides ($\approx 15^{\circ}$ outward angle).
  - Legs straight with feet grounded, heels aligned with the ground baseline ($Y = 1000$).
- **Background**: Strictly 100% transparent PNG (32-bit RGBA). No fringe, matte bleed, or white halos.

## 3. Required & Optional Cutout Parts

| Part Key | Target Slot | Required? | Description |
| :--- | :--- | :--- | :--- |
| `head` | `slot_head` | **REQUIRED** | Face, cranial base, and main facial features |
| `hair_front` | `slot_head` | Optional | Forehead bangs and face-framing strands |
| `hair_back` | `slot_head` | Optional | Long ponytail or back hair mane behind torso |
| `torso` | `slot_torso` | **REQUIRED** | Main chest, ribs, and collar |
| `pelvis` | `slot_pelvis` | **REQUIRED** | Hips, belt, sash |
| `robe_front` | `slot_robe_front` | Optional | Front apron, tassels, or robe drapery |
| `robe_back` | `slot_robe_back` | Optional | Back cloak or tailcoat layer |
| `upper_arm_R` | `slot_arm_near` | **REQUIRED** | Near bicep/shoulder |
| `forearm_R` | `slot_arm_near` | **REQUIRED** | Near forearm and cuff |
| `hand_R` | `slot_arm_near` | **REQUIRED** | Near gripping fist / weapon hand |
| `upper_arm_L` | `slot_arm_far` | **REQUIRED** | Far bicep/shoulder |
| `forearm_L` | `slot_arm_far` | **REQUIRED** | Far forearm and cuff |
| `hand_L` | `slot_arm_far` | **REQUIRED** | Far hand |
| `thigh_R` | `slot_leg_near` | **REQUIRED** | Near upper leg |
| `shin_R` | `slot_leg_near` | **REQUIRED** | Near calf, boot shaft |
| `foot_R` | `slot_leg_near` | **REQUIRED** | Near shoe / boot sole |
| `thigh_L` | `slot_leg_far` | **REQUIRED** | Far upper leg |
| `shin_L` | `slot_leg_far` | **REQUIRED** | Far calf, boot shaft |
| `foot_L` | `slot_leg_far` | **REQUIRED** | Far shoe / boot sole |
| `weapon` | `slot_weapon` | Optional | Sword, staff, spear, or talisman |

## 4. Joint Pivot & Distal Anchor Convention
All joint positions are defined in normalized texture coordinates $[u, v] \in [0.0, 1.0]$.
- **`pivot`**: The proximal joint location where this part connects to its parent bone.
- **`distalAnchor`**: The distal point on this part where child parts attach.

### Semantic Anchor Mapping:
- **`upper_arm`**: `pivot` = Shoulder joint center; `distalAnchor` = Elbow center.
- **`forearm`**: `pivot` = Elbow center; `distalAnchor` = Wrist joint center.
- **`hand`**: `pivot` = Wrist joint center; `distalAnchor` = Grip center for weapon binding.
- **`thigh`**: `pivot` = Hip joint center; `distalAnchor` = Knee joint center.
- **`shin`**: `pivot` = Knee joint center; `distalAnchor` = Ankle joint center.
- **`foot`**: `pivot` = Ankle joint center; `distalAnchor` = Toe tip ground contact.
- **`torso`**: `pivot` = Waist / bottom of ribs; `distalAnchor` = Neck base center.
- **`neck`**: `pivot` = Neck base center; `distalAnchor` = Cranial base center.
- **`head`**: `pivot` = Cranial base / chin alignment.

## 5. Strategic Joint Seam Overlap Requirements
Cutout 2D animation without mesh skinning requires geometry overlap to prevent gaps (holes) when bones rotate during wide-range combat motions:
1. **Shoulder / Torso**: Upper arm heads must be rounded and extend at least $15\text{px}$ under shoulder pauldrons or collar guards.
2. **Elbows & Knees**: The proximal head of child limb segments (`forearm`, `shin`) must be authored as a circular convex cap extending beyond the joint pivot into the parent limb sleeve/trousers.
3. **Waist & Belt**: The pelvis part or belt sash must overlap both the bottom of the torso ($> 20\text{px}$) and the tops of both thighs.
4. **Wrists & Cuffs**: Wide sleeves or cuff rings must conceal wrist rotation seams up to $\pm 60^{\circ}$.
5. **Boots & Ankles**: Boot rims or trouser cuffs must encapsulate the ankle pivot.

## 6. Costume Design Constraints (Supported vs. Unsupported)
- **Supported**:
  - Layered robes with split front and back hems allowing independent leg locomotion.
  - Wide martial sleeves covering elbow articulation.
  - Pauldrons, shoulder capes, belts, and sash cords that cover joint intersections.
  - Separate armor plates strapped to thigh/shin.
- **Strictly Unsupported**:
  - Tight tube skirts or mermaid dresses binding both legs into a single silhouette (prevents run and kick cycles).
  - Monolithic one-piece skin-tight body suits with high-contrast continuous vertical stripes across joints.
  - Connected cloaks pinned across both wrists simultaneously (creates impossible FK kinematic constraints).

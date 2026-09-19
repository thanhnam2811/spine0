# Specification: Style-B Canonical Rig (v0)

## 1. Canonical Topology

The Style-B humanoid rig consists of a single root-rooted tree with 17 canonical bones:

```text
root
└── pelvis
    ├── torso
    │   ├── neck
    │   │   └── head
    │   ├── upper_arm_L (far side)
    │   │   └── forearm_L
    │   │       └── hand_L
    │   └── upper_arm_R (near side)
    │       └── forearm_R
    │           └── hand_R
    ├── thigh_L (far side)
    │   └── shin_L
    │       └── foot_L
    └── thigh_R (near side)
        └── shin_R
            └── foot_R
```

All humanoid characters share this exact bone hierarchy. No bone may be added, deleted, or reparented in V0.

## 2. Canonical Profile: `humanoid-normal-v1`

- **Reference Character Height**: `1000.0` units (pixels at standard authoring scale).
- **Default Hierarchy and Rest Offsets**:

| Bone ID | Parent | Local X | Local Y | Rest Rotation (deg) | Canonical Length | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `root` | `null` | 0.0 | 1000.0 | 0.0 | 0.0 | Ground reference point between feet |
| `pelvis` | `root` | 0.0 | -500.0 | 0.0 | 60.0 | Base of spine / hips |
| `torso` | `pelvis` | 0.0 | -60.0 | 0.0 | 180.0 | Mid/upper chest |
| `neck` | `torso` | 0.0 | -180.0 | 0.0 | 40.0 | Base of skull |
| `head` | `neck` | 0.0 | -40.0 | 0.0 | 140.0 | Top of head reference |
| `upper_arm_L` | `torso` | 20.0 | -160.0 | 15.0 | 120.0 | Far shoulder joint |
| `forearm_L` | `upper_arm_L`| 0.0 | 120.0 | 10.0 | 110.0 | Far elbow joint |
| `hand_L` | `forearm_L` | 0.0 | 110.0 | 5.0 | 50.0 | Far wrist/hand |
| `upper_arm_R` | `torso` | -20.0 | -160.0 | -15.0 | 120.0 | Near shoulder joint |
| `forearm_R` | `upper_arm_R`| 0.0 | 120.0 | -10.0 | 110.0 | Near elbow joint |
| `hand_R` | `forearm_R` | 0.0 | 110.0 | -5.0 | 50.0 | Near wrist/hand (weapon hand) |
| `thigh_L` | `pelvis` | 30.0 | 20.0 | 5.0 | 220.0 | Far hip joint |
| `shin_L` | `thigh_L` | 0.0 | 220.0 | -5.0 | 200.0 | Far knee joint |
| `foot_L` | `shin_L` | 0.0 | 200.0 | 0.0 | 60.0 | Far ankle/foot |
| `thigh_R` | `pelvis` | -30.0 | 20.0 | -5.0 | 220.0 | Near hip joint |
| `shin_R` | `thigh_R` | 0.0 | 220.0 | 5.0 | 200.0 | Near knee joint |
| `foot_R` | `shin_R` | 0.0 | 200.0 | 0.0 | 60.0 | Near ankle/foot |

## 3. Slots and Visual Hierarchy

Visual layers are defined as **Slots** attached to specific bones. Draw order is managed dynamically through slot sorting:

| Slot ID | Bound Bone | Default Draw Order | Category |
| :--- | :--- | :--- | :--- |
| `slot_weapon_back` | `torso` | 10 | Weapon sheath / carried back |
| `slot_robe_back` | `pelvis` | 20 | Back robe hem / cloak |
| `slot_arm_far` | `upper_arm_L` / `forearm_L` / `hand_L` | 30 | Far arm cutout parts |
| `slot_leg_far` | `thigh_L` / `shin_L` / `foot_L` | 40 | Far leg cutout parts |
| `slot_pelvis` | `pelvis` | 50 | Pelvis / belt base |
| `slot_leg_near` | `thigh_R` / `shin_R` / `foot_R` | 60 | Near leg cutout parts |
| `slot_robe_front` | `pelvis` | 70 | Front robe layer / skirt |
| `slot_torso` | `torso` | 80 | Torso / chest armor |
| `slot_head` | `head` | 90 | Head / face / hair |
| `slot_arm_near` | `upper_arm_R` / `forearm_R` / `hand_R` | 100 | Near arm cutout parts |
| `slot_weapon` | `hand_R` | 110 | Primary wielded weapon |

## 4. Rig Families

While topology is universal, geometry profiles may differ into distinct rig families:
1. `humanoid-normal-v1`: Standard martial artist / sword cultivator proportions.
2. `humanoid-robe-v1`: Slimmer frame, elongated sleeves/lower hems, lower limb stance.
3. `humanoid-heavy-v1`: Broader shoulders, thicker torso, wider stance for armored combatants.
4. `humanoid-small-v1`: Compact torso and limbs, larger head-to-body ratio (chibi/small enemy).

## 5. Permitted Bone Overrides (v0)

A character may specify overrides in `boneOverrides`:
```ts
type BoneOverride = {
  x?: number
  y?: number
  rotation?: number
  length?: number
}
```

### Prohibitions
- `scaleX` and `scaleY` are strictly FORBIDDEN in overrides.
- Modifying parent/child bone connections is strictly FORBIDDEN.
- Adding or removing bones is strictly FORBIDDEN.

## 6. Override Metrics & Thresholds

For every character, the factory computes:
- `override_count`: Total number of bones with at least one field overridden.
- `material_override_count`: Number of bones with **material** deviations:
  - $|\Delta L| / L_{\text{canonical}} > 0.05$ (length deviates by $> 5\%$), OR
  - $|\Delta \theta| > 3.0^{\circ}$ (rest rotation deviates by $> 3^{\circ}$), OR
  - $\sqrt{\Delta x^2 + \Delta y^2} / H_{\text{ref}} > 0.02$ (position deviates by $> 2\%$ of character height).
- `material_override_ratio`: $\frac{\text{material\_override\_count}}{\text{eligible\_bones}} = \frac{\text{material\_override\_count}}{17}$.
- `mean_length_deviation`: Mean absolute length deviation across all bones.
- `max_length_deviation`: Maximum absolute length deviation.
- `mean_rest_rotation_deviation`: Mean absolute rotation deviation.
- `max_rest_rotation_deviation`: Maximum absolute rotation deviation.

**Rig Fit Gate**: If `material_override_ratio > 0.40` (more than 6 of 17 bones materially deviate), the validator flags `RIG_OVERRIDE_RATIO_HIGH`, indicating the character should belong to an alternate Rig Family rather than forcing an ill-fitting canonical profile.

# R&D Spike Methodology: 2D Skeletal Animation Factory

## 1. Objective & Hypothesis
The purpose of this R&D spike is to rigorously evaluate whether Style-B 2D game characters can reuse shared skeletal animation templates without character-specific keyframing or expensive manual animation authoring.

The initial research question tests:
> *Can Style-B humanoid characters that conform to a controlled art contract reuse shared animation templates with little character-specific correction?*

The core engineering model is:
$$\text{controlled topology} + \text{rig families} + \text{bounded setup overrides} + \text{shared templates} = \text{low-cost production}$$

## 2. Experimental Separation: Calibration vs. Challenge Sets
To prevent data contamination and overfitting, the experimental protocol strictly separated training/development fixtures from evaluation fixtures across two distinct phases:

1. **Calibration Phase**:
   - Fixtures: `dev-a` (standard sword cultivator), `dev-b` (slimmer robe cultivator), `dev-c` (broader humanoid).
   - Used exclusively to tune setup semantics, develop the anatomy envelope, establish reference coordinate transforms, and implement the anim-core engine, validator, and compiler.
2. **Freeze Gate**:
   - Before evaluating challenge fixtures, all canonical rig hierarchies, geometry profiles, anatomy envelope ratios, animation keyframes, and schema definitions were cryptographically frozen and logged in `docs/spike-results/freeze-manifest.json`.
3. **Challenge Phase**:
   - Fixtures: `test-a` (male sword cultivator), `test-b` (female sword cultivator), `test-c` (wide armored warrior), `test-d` (high-volume robe elder), `test-e` (semi-chibi goblin fighter).
   - Evaluated strictly against the frozen artifacts without modifying animation files, canonical rig definitions, or envelope bounds.

## 3. Evaluation Dimensions & Failure Taxonomy
Every character $\times$ clip cell is evaluated along:
- **Kinematic Integrity**: Hierarchy traversal, parent-to-child joint anchoring, and world coordinate transforms.
- **Seam & Silhouette Cohesion**: Absence of limb detachment or visible seam tearing during wide angular sweeps.
- **Dynamic Draw Order**: Correct front/back layer transitions (e.g. weapon windup behind back $\to$ slash impact in front $\to$ recovery behind).
- **Proportional Envelope Fit**: Adherence to mathematical ratios for head, torso, limbs, and stance width.

Failures are categorized according to a strict failure taxonomy:
- `ART`: Sprite cutout missing required overlap or incorrect anchor placement.
- `RIG`: Topology, parent binding, or bone count mismatch.
- `RETARGET`: Kinetic distortion, trajectory clipping, or stride slip caused by proportion differences.
- `ANIMATION`: Corrupt keyframes, non-finite values, or invalid draw order indices.
- `RUNTIME`: Engine execution exception or numerical divergence.
- `EDITOR`: Tooling / authoring state defect.
- `SPEC`: Violation of frozen anatomy envelope or forbidden override rules.

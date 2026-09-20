# Phase B: Minimal Rig Adjuster — User Workflow Guide

## 1. Overview

The **Minimal Rig Adjuster** is designed for 2D character technical artists to calibrate Style-B humanoid characters against a target canonical rig family in under 2 minutes.

---

## 2. Step-by-Step Operator Workflow

### Step 1: Character & Family Selection
1. Launch the editor via `pnpm editor` (or `pnpm --filter editor dev`) and open `http://localhost:5174/`.
2. From the top toolbar, choose a character preset:
   - Calibration: `dev-a`, `dev-b`, `dev-c`
   - Normal Family: `test-a` (Normal), `test-d` (Normal)
   - Heavy Family: `test-c` (Heavy)
   - Small Family: `test-e` (Small)
3. The editor automatically selects the corresponding rig family (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) and loads the character's setup overrides.

---

### Step 2: Bone Pivot & Rest Pose Adjustment
1. Select a bone by:
   - Clicking directly on a bone or its pivot handle in the viewport.
   - Or selecting the bone from the **Hierarchy Panel** on the left.
2. In the viewport:
   - Drag the round **pivot handle** to adjust translation offset $(dx, dy)$ relative to the canonical bone rest position.
   - Observe the live position values updating in the **Inspector Panel** on the right.
3. In the Inspector Panel:
   - Enter precise numerical values for translation $(dx, dy)$ and rest rotation $(\Delta\theta^\circ)$.
   - Click **Reset Override** to restore the bone to canonical rig rest pose.
4. Each continuous drag gesture automatically coalesces into a single undo step. Press `Ctrl+Z` to undo or `Ctrl+Y` to redo.

---

### Step 3: Distal Anchor Tuning
1. In the Hierarchy or Viewport, select a distal anchor (e.g., weapon tip, foot ground-contact, hand grasp point).
2. Drag the square **distal anchor handle** in the viewport or adjust $(dx, dy)$ in the Inspector.
3. Distal anchors define bone length and weapon reach boundaries for slash and contact calculations.

---

### Step 4: Slot Attachment & Setup Draw Order
1. To inspect slot bindings:
   - Switch to the **Slots** tab in the left Hierarchy Panel.
   - Click a slot (e.g., `slot_weapon`, `slot_torso`, `slot_arm_r`).
2. To re-parent a slot:
   - Use the **Parent Bone** dropdown in the Inspector to reassign the slot to a different skeletal bone.
3. To adjust setup draw order:
   - Select a slot and click **Move Up** or **Move Down** to modify the render priority in setup pose.

---

### Step 5: Live Contract Compliance & Family Fit Verification
1. Inspect the **Live Validation Panel** on the right:
   - Check the overall compliance status (`✓ Fully Compliant` or `✗ N Issues`).
   - Monitor the **Material Override Ratio**: ensuring $\le 40\%$ of bones carry non-zero setup overrides.
   - Review any active warnings or errors. Clicking on an issue automatically selects the target bone or slot.
2. Inspect the **Family Fit Panel**:
   - Compares the character's proportions against all three families simultaneously.
   - Displays fit metrics: Normal, Heavy, Small.
   - If an archetype has drifted out of bounds for the current family, click **Switch to Recommended Family** to re-target the character immediately.

---

### Step 6: Motion Preview & Clearance Verification
1. Click **Preview Mode** in the top toolbar or bottom playback bar.
2. Choose an animation template: `idle`, `run`, or `slash`.
3. Press **Play / Pause** (`Spacebar`), scrub the timeline bar, or adjust playback speed (`0.25x` slow-motion to `2.0x`).
4. Toggle overlays to inspect:
   - **Skeleton**: Visualizes bone transforms during motion retargeting.
   - **Ground Line**: Verifies foot contact during run cycles ($y \approx 0$).
   - **Clearance Proxies**: Wireframe circles check sword clearance during slash swings.

---

### Step 7: Exporting Setup Definition
1. Once fully validated with zero errors, click **Export JSON** in the top toolbar.
2. The editor generates a deterministic, formatted `CharacterDefinition` JSON file containing:
   - Selected rig family
   - Validated bone setup overrides
   - Slot attachment definitions and draw order
3. Save the JSON file directly into `fixtures/` or the asset pipeline.
4. Check **Session Metrics** in the top bar to inspect total time, commands executed, and undo/redo count.

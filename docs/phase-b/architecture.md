# Phase B: Minimal Rig Adjuster — Architecture

## 1. Overview & System Design

The **Minimal Rig Adjuster** (`apps/editor`) is a lightweight, specialized interactive authoring environment designed specifically to validate the feasibility of low-overhead character setup within the Style-B 2D skeletal animation pipeline.

Unlike general-purpose animation software (such as Spine or DragonBones) which combine rigging, skinning, mesh deformation, and timeline keyframing into monolithic suites, the Minimal Rig Adjuster operates on a strict single-responsibility boundary:

```text
+-----------------------------------------------------------------------------------+
|                              Editor Architecture                                  |
|                                                                                   |
|  +--------------------+      Command Pattern      +----------------------------+  |
|  |   UI / Viewport    | ------------------------> |       HistoryManager       |  |
|  |  (PixiJS + React)  |                           | (Undo / Redo / Coalescing) |  |
|  +--------------------+                           +----------------------------+  |
|            |                                                    |                 |
|            | reads state                                        | executes /      |
|            v                                                    v unexecutes      |
|  +-----------------------------------------------------------------------------+  |
|  |                               EditorDocument                                |  |
|  |  - CharacterDefinition (mutable state)                                      |  |
|  |  - Target RigDefinition & Target AnatomyEnvelope                            |  |
|  |  - Rig & Envelope Catalogs (Normal, Heavy, Small)                           |  |
|  |  - SessionMetricsTracker                                                    |  |
|  +-----------------------------------------------------------------------------+  |
|            |                                                    |                 |
|            v                                                    v                 |
|  +-----------------------------+                  +----------------------------+  |
|  |     Validation Engine       |                  |      Preview Pipeline      |  |
|  |  - validateCharacter()      |                  |  - evaluateFrame()         |  |
|  |  - computeCharacterMetrics()|                  |  - compileCharacter()      |  |
|  |  - validateFamilyAssignment |                  |  - PixiJS Skeleton Render  |  |
|  +-----------------------------+                  +----------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Modules & Boundaries

### 2.1 Headless Core Model (`apps/editor/src/model/`)

The core editing logic is completely headless and decoupled from React and PixiJS. It can be instantiated, mutated, tested, and serialized in pure Node.js environments:

- **[`EditorDocument`](file:///G:/PERSONAL/spine0/apps/editor/src/model/document.ts)**:
  Encapsulates the single source of truth for the character under adjustment, the active rig family, target envelope, and validation cache. Emits change events to subscribed listeners.
- **[`HistoryManager`](file:///G:/PERSONAL/spine0/apps/editor/src/model/history.ts)**:
  Maintains linear undo/redo stacks (`undoStack`, `redoStack`) with support for discrete commands and continuous interactive drag transactions (`beginTransaction`, `commitTransaction`, `rollbackTransaction`).
- **[`Command`](file:///G:/PERSONAL/spine0/apps/editor/src/model/commands.ts)**:
  Command pattern implementations for all allowed setup mutations:
  - `SetBoneOverrideCommand`: Edits bone pivot translation (`dx`, `dy`) and rest rotation (`rotation_deg`).
  - `SetDistalAnchorCommand`: Adjusts distal anchor offset (`dx`, `dy`) and segment length.
  - `SetSlotBoneCommand`: Rebinds a visual slot to a different parent bone.
  - `SetSetupDrawOrderCommand`: Reorders slot layering in setup pose.
  - `ChangeFamilyCommand`: Switches the target rig family with automated compatibility re-evaluation.
- **[`SessionMetricsTracker`](file:///G:/PERSONAL/spine0/apps/editor/src/model/metrics.ts)**:
  Captures quantitative ergonomics metrics during every editing session:
  - Elapsed active editing time (seconds)
  - Total applied commands count
  - Undo and redo frequency count
  - Rig family switch count
  - Export event count

---

## 3. Visual Viewport & Interaction Layer (`apps/editor/src/components/Viewport.tsx`)

The viewport is powered by PixiJS v8 and HTML5 Canvas:
1. **Camera Transformation**:
   - Pan (middle mouse drag or right click drag) and smooth zoom (mouse wheel).
   - Automatic focus and coordinate translation between screen space and rig space (origin at feet `[0, 0]`, Y-up).
2. **Setup Mode Rendering**:
   - **Bones**: Drawn with directional tapered bone polygons, parent-child dashed linkages, and color-coded selection highlights.
   - **Pivot Handles**: Circular interactive handles for translation and rotation pivot dragging.
   - **Distal Anchor Handles**: Square handles at bone segment extremities to visualize bone length and child attachment points.
   - **Clearance Proxies**: Wireframe circles rendered around critical joints (weapon, hands, head) to visually preview clearance violations.
   - **Envelope Bounds**: Bounding guides indicating the legal envelope limits.
3. **Continuous Drag Coalescing**:
   - On pointer down on a handle: `history.beginTransaction(...)`.
   - On pointer move: `cmd.execute(doc)` modifies the bone override in place.
   - On pointer up: `history.commitTransaction()` packages all intermediate moves into a single undoable step.

---

## 4. Live Validation & Family Fit Loop

Every document mutation triggers an immediate synchronous pass through the frozen Phase A/A.1 validation engine:

1. **`validateCharacter(character, targetRig, targetEnvelope)`**:
   Computes exact issue codes (`ERR_SETUP_OVERRIDE_OUT_OF_BOUNDS`, `ERR_UNBOUND_SLOT`, etc.) and severity levels.
2. **`computeCharacterMetrics(character, targetRig)`**:
   Calculates `material_override_ratio` (percentage of bones with setup overrides, threshold $\le 0.40$).
3. **`validateFamilyAssignment(character, availableRigs, availableEnvelopes)`**:
   Evaluates character proportions across all three rig families (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) simultaneously:
   - Displays family fit status (Conforming / Marginal / Violating).
   - Recommends optimal family switch if current family violates envelope constraints.

---

## 5. Animation Preview Player

In **Preview Mode**, the viewport switches from static setup manipulation to dynamic multi-clip playback:
- Reuses the exact Phase A evaluation engine: `@animation-factory/anim-core` (`evaluateFrame`, `interpolateKeyframes`).
- Plays frozen templates (`idle`, `run`, `slash`) across arbitrary frame rates and playback speeds (`0.25x` to `2.0x`).
- Demonstrates real-time retargeting: applying shared skeletal motion onto character-specific setup overrides with zero code modification.
- Overlays skeletal linkage and contact clearance proxies during live playback to visually inspect ground contact and self-intersection clearances.

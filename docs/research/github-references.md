# Reference Research Report: 2D Skeletal Animation Systems

This document synthesizes findings from inspecting five reference repositories to inform the design and architecture of the **2D Character Animation Factory** (Style-B R&D Experiment).

---

## 1. SpriteForge (`Wilson-Cheng/SpriteForge`)

- **Repository**: `https://github.com/Wilson-Cheng/SpriteForge`
- **Scope Inspected**: Forward Kinematics evaluation, world transforms, undo/redo architecture, viewport rendering, and animation math.

### Exact Files Inspected
- `src/core/eval.ts`: Forward kinematics tree traversal, DFS topological order, and 3x3 transform composition.
- `src/core/animation.ts`: Shared animation sampling engine, cubic bezier evaluation (Newton-Raphson + bisection), and FK composition.
- `src/core/model.ts`: Project data structure, bone hierarchy, attachments, and timeline models.
- `src/editor/history.ts`: Full-project snapshot undo/redo system tied to event bus emits.
- `src/editor/viewport.ts`: Canvas pan/zoom, coordinate transformation, gizmo interactions.

### Patterns Adopted
1. **Shared Core Animation Engine (`src/core/animation.ts`)**: Pure mathematical sampling and FK world matrix calculation completely decoupled from the DOM and renderer, shared symmetrically by both editor preview and runtime.
2. **Topological Bone Evaluation (`src/core/eval.ts`)**: Roots-first DFS traversal ensuring parents are transformed before children, resolving world matrices via clean 2D affine matrix multiplication.
3. **Transaction-Coalesced History Concept (`src/editor/history.ts`)**: Pointer drag actions emit continuous preview updates but commit only a single unified history step on pointer release (`pointerUp`).

### Patterns Rejected
1. **Full-Project Snapshot Undo in Core**: Cloning the whole document state on every mutation is too memory-intensive for large character rosters. We reject full-state serialization in favor of scoped delta/command transactions in Phase B.
2. **Mesh Deformation & Weight Painting**: SpriteForge includes complex mesh triangulation and vertex weight painting (`src/core/mesh.ts`), which violates our 2D cutout art contract and adds huge complexity.
3. **Spine 3.8/4.1 Import/Export Compatibility**: Translating to Spine JSON format introduces complex legacy constraints that distract from our controlled template hypothesis.

### Pitfalls & Risks
- **Matrix Representation Overhead**: SpriteForge wraps Float32Array in object wrappers `{ m: Float32Array }`, causing GC thrashing during continuous frame updates if not pooled.
- **Cycle Vulnerabilities**: Cyclic parent pointers in arbitrary hierarchies can cause infinite recursion without cycle detection guards.

### Design Impact on Animation Factory
- `anim-core` will implement a pure, renderer-agnostic FK evaluation pipeline with roots-first bone traversal.
- Drag events in preview/editor must cleanly separate continuous preview updates from committed state changes.

---

## 2. Bones (`foundermafstat/bones`)

- **Repository**: `https://github.com/foundermafstat/bones`
- **Scope Inspected**: Source format to compiled runtime format architecture, schema versioning, compiler pipeline, PixiJS 8 runtime integration.

### Exact Files Inspected
- `packages/schema/src/types.ts`: Semantic rig and character project definitions, version constants (`BONES_SCHEMA_VERSION = "1.2.0"`).
- `packages/schema/src/validate.ts`: Strict schema checking and issue reporting.
- `packages/compiler/src/compiler.ts`: Multi-stage compilation pipeline (`SOURCE FORMAT -> compiler -> RUNTIME FORMAT`).
- `packages/compiler/src/types.ts`: Packed lookup tables, compiled clip structures, and flattened part definitions.
- `packages/runtime-pixi/src/RigInstance.ts`: PixiJS v8 container and graphics management applying compiled frames.
- `implementation-milestones.md`: Milestone roadmap separating core execution from visual platforming.

### Patterns Adopted
1. **Source vs. Runtime Separation (`packages/schema` vs `packages/compiler`)**: Authoring formats are human-readable, semantic, and easily diffable JSON, while compiler outputs are deterministic, pre-flattened, validated runtime representations (`CompiledCharacter`).
2. **Schema Versioning & Target Tagging**: Explicit `schemaVersion` and `runtimeTarget: "pixi-v8"` in rig/character definitions to guard against runtime mismatch.
3. **Strict Separation of Bones, Slots, and Parts/Attachments**: Bones own kinematic transforms; slots own draw order indices; parts/attachments own sprite textures and visual UV/pivots.

### Patterns Rejected
1. **State Machine & Blend Trees**: Bones includes `RuntimeStateMachineController`, condition evaluators, transitions, and blend trees. These are out of scope for our factory experiment.
2. **Procedural Layering & Constraint Solvers**: Foot IK, weapon constraints, and procedural spring physics (`ConstraintSolver.ts`, `ProceduralLayers.ts`) introduce non-deterministic dynamic behavior that invalidates template reuse isolation.

### Pitfalls & Risks
- **Compiler Over-Packing**: Prematurely packing transforms into contiguous binary flatbuffers makes debugging diffs and regression testing opaque. We must keep V0 compiled artifacts in readable, deterministic JSON.
- **Tight Coupling to Game Mechanics**: Baking fighter combat logic and hurtbox collision into the rig format complicates general animation testing.

### Design Impact on Animation Factory
- We will organize our monorepo with `packages/schema`, `packages/compiler`, and `packages/runtime-pixi`.
- Compiler tests will use golden snapshots (`fixtures/expected/runtime/`) to verify deterministic compilation outputs.

---

## 3. skeleton-rig (`frycz/skeleton-rig`)

- **Repository**: `https://github.com/frycz/skeleton-rig`
- **Scope Inspected**: Minimal viable skeletal animation core, keyframe sampling, shortest-angle interpolation, canvas rendering.

### Exact Files Inspected
- `animation.js`: Keyframe sampling, timeline playback, angle interpolation, capture of bone states.
- `skeleton-renderer.js`: Minimal rendering of bones, joint circles, and attached graphics on 2D canvas context.
- `animations/character.json` & `animations/skeleton.json`: Minimal JSON representations of hierarchy and keyframe tracks.

### Patterns Adopted
1. **Minimalist Animation Core**: Demonstrates that clean forward kinematics and 2D rotation interpolation require under 300 lines of focused math without framework bloat.
2. **Shortest-Path Angular Interpolation**: Angle interpolation normalizing angular deltas to `[-PI, PI]` or `[-180, 180]` to prevent unsightly 359° spinning flips when crossing 0°.
3. **Relative Rotation Representation**: Bones store their local rotation relative to their parent rather than absolute world angles.

### Patterns Rejected
1. **Full-Skeleton State Snapshots per Keyframe**: In `animation.js`, every keyframe captures all bone rotations as an array dump rather than sparse, property-specific animation channels.
2. **Imperative DOM/Canvas Rendering**: Directly mixing dragging math with canvas rendering (`skeleton-renderer.js`) makes headless testing impossible.

### Pitfalls & Risks
- **Full-State Capture Redundancy**: Authoring full skeleton state keyframes makes retargeting and template reuse impossible, because untouched bones cannot inherit character setup poses or layer deltas.
- **Unbounded Keyframe Timing**: Relying on arbitrary frame indices instead of normalized floating-point seconds causes framerate drift.

### Design Impact on Animation Factory
- `anim-core` will remain lean, isolated, and focused solely on FK math, shortest-angle delta interpolation, and sparse track sampling.
- Animation tracks must store deltas (`rotationDelta`), not absolute poses, enabling clean addition to resolved character setup poses.

---

## 4. Proscenio (`firebound/proscenio`)

- **Repository**: `https://github.com/firebound/proscenio`
- **Scope Inspected**: Validation architecture, issue dataclasses with stable codes, fixture organization, headless testing, golden test suites.

### Exact Files Inspected
- `apps/blender/core/validation/issue.py`: Issue dataclass with severity, structured message, and offending target path.
- `apps/blender/core/validation/checks/`: Modular validation checks (`bone_orientation.py`, `slots.py`, `bone_follow.py`).
- `.ai/skills/testing.md`: Test execution strategy combining hand-authored fixtures and procedurally generated test cases.
- `apps/blender/core/skinning/sidecar_schema.py`: Sidecar data structure separating art assets from rig metadata.

### Patterns Adopted
1. **Structured Validation Issues with Deterministic Codes**: Validation yields typed issue objects (`severity`, `code`, `message`, `target`) rather than throwing exceptions or printing raw text.
2. **Calibration vs. Challenge Fixture Discipline**: Maintaining authored test cases alongside strict golden reference verification.
3. **Headless Execution Verification**: Pure test suites executing validation and export in headless CI without graphical display dependencies.

### Patterns Rejected
1. **Blender Python / Godot GDScript Toolchain**: Blender addon dependencies and Godot scene tree serialization are specific to their 3D/2D hybrid pipeline and irrelevant to our TypeScript/PixiJS stack.
2. **Complex Sidecar File Synchronization**: Storing metadata in external sidecar files next to PSDs introduces sync drift; we keep character definitions centralized in structured JSON.

### Pitfalls & Risks
- **Warning Inflation**: When validators produce hundreds of warnings for non-critical visual tolerances, developers ignore errors. Every validation code must represent a distinct art or rig constraint.
- **Brittle Export Goldens**: Golden tests that depend on floating point formatting or un-ordered object keys break across environments unless serialization is explicitly canonicalized.

### Design Impact on Animation Factory
- `packages/validator` will implement stable issue codes (`ART_*`, `SPEC_*`, `RIG_*`, `ANIM_*`) and categorized failure taxonomy.
- Headless unit and golden tests will run in GitHub Actions CI with zero graphical dependencies.

---

## 5. 2D_animation (`triangletechguy/2D_animation`)

- **Repository**: `https://github.com/triangletechguy/2D_animation`
- **Scope Inspected**: React to PixiJS 8 boundary, stage rendering pipeline, layer world transform resolution.

### Exact Files Inspected
- `apps/web/src/components/PixiStage.tsx`: React component mounting and unmounting PixiJS Application, handling resize and animation loop.
- `apps/web/src/components/stage/runtime.ts`: Sampling project state at current time and feeding evaluated poses to the stage.
- `apps/web/src/components/stage/rendering.ts`: Managing Pixi Container, Sprites, Texture caches, and debug overlays based on sampled poses.
- `apps/web/src/components/stage/types.ts`: Data types bridging pure core models and PixiJS render tree.

### Patterns Adopted
1. **One-Way Core-to-Pixi Pose Dispatch**: React controls timeline state (time, clip, play/pause); `anim-core` evaluates the pose at time `t`; `rendering.ts` applies the resolved pose directly to Pixi containers/sprites without reverse state synchronization.
2. **Container/Sprite Hierarchy Mirroring Slots**: Separating bone transformation logic from visual sprite display, grouping attachments under slot containers.
3. **Dedicated Debug Overlay Pass**: Rendering skeleton bones, pivot points, and distal anchors on a separate overlay container toggleable via UI state.

### Patterns Rejected
1. **AI Segmentation & Background Removal**: In-browser body segmentation and background removal modules (`BodySegmentationModule.tsx`) introduce heavyweight web workers and unneeded dependencies.
2. **Facial Animation / Lip Sync Visemes**: Audio-driven lip sync and viseme blending are out of scope for Style-B game combat/locomotion skeletons.

### Pitfalls & Risks
- **React State Inside Animation Tick**: Triggering React state updates (`setState`) on every 60fps frame tick causes severe dropped frames. Pixi ticker must directly query time or run inside a requestAnimationFrame callback, while React only controls high-level properties (selected character, active clip, paused state).
- **Texture Leaks on Character Switch**: Failing to destroy or manage textures when switching between characters leads to WebGL memory exhaustion.

### Design Impact on Animation Factory
- `apps/preview` will use React only for controls (fixture selection, clip playback controls, debug toggles).
- PixiJS 8 rendering in `packages/runtime-pixi` will be a pure consumer of `EvaluatedPose` from `anim-core`.

---

## 6. Synthesis: Final Architecture Decisions

1. **Monorepo Layout**:
   - `packages/schema`: Authoring JSON schemas and TypeScript types for Rigs, Characters, Animations, and Anatomy Envelopes.
   - `packages/anim-core`: Pure TypeScript FK math, angle normalization, delta composition, normalized translation bases (`selfBone`, `characterHeight`), and dynamic draw order keying. Zero dependencies on DOM or Pixi.
   - `packages/validator`: Static and semantic validation rules with stable codes (`ART_*`, `SPEC_*`, `RIG_*`, etc.) checking anatomy envelopes, bone hierarchies, slot references, and override thresholds.
   - `packages/compiler`: Deterministic compiler transforming source rigs, characters, and animations into `CompiledCharacter` runtime format.
   - `packages/runtime-pixi`: PixiJS 8 adapter applying compiled or sampled poses to DisplayObjects with debug overlays.
   - `apps/preview`: Minimal diagnostic Vite + React + PixiJS 8 viewer for inspecting calibration and challenge fixtures. (NO editor in Phase A).

2. **Rejected Alternatives**:
   - Spine 2D JSON Compatibility Layer: Rejected to keep math and schemas clean, focused, and bounded.
   - Mesh Deformation / Skinning: Rejected; Style-B relies on controlled cutout parts with strategic overlap.
   - State Machines & Physics Constraints: Rejected; all motion is driven by frozen clip templates.

3. **Remaining Experimental Questions for Phase A**:
   - Can a single canonical humanoid rig accommodate slim robe cultivators and broad armored warriors without seam tearing or silhouette collapse during high-stress combat animations (e.g. `slash`)?
   - Does normalized translation based on `selfBone` and `characterHeight` preserve contact points during run cycles across differing limb ratios?
   - What are the exact override thresholds where a character transitions from "bounded override" to requiring a dedicated Rig Family?

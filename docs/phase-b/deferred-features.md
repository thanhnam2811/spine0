# Phase B: Minimal Rig Adjuster — Explicitly Deferred Features

## 1. Context & Scope Governance

The objective of Phase B is to provide a focused, lightweight visual rig correction tool to validate whether Style-B character setup can be achieved within bounded contract limits.

In accordance with the R&D Charter and the Lean Engineering Kernel:
> **Do NOT build a full animation suite.** The spike succeeds if it proves or falsifies the core hypotheses with minimum necessary engineering.

The following features were intentionally excluded from Phase B to prevent scope creep, architectural dilution, and unnecessary implementation complexity.

---

## 2. Inventory of Deferred Features

| Feature | Rationale for Deferral | Recommended Future Phase |
| :--- | :--- | :--- |
| **Timeline Editor & Keyframing UI** | Animations are authored in standard DCC tools (e.g. Spine/Blender) and exported as shared templates (`idle`, `run`, `slash`). Rig Adjuster only calibrates character setup poses, not animation curves. | Deferred to Animation Authoring Tooling (if in-house authoring is required) |
| **Animation Curves & Dopesheet** | The pipeline's core value proposition is *reusing* pre-baked shared animation templates. Per-character curve tweaking undermines template sharing economics. | Deferred / Out of Scope |
| **Inverse Kinematics (IK) Solver** | The canonical rig hierarchy is forward-kinematic (FK) with bounded setup offsets. Retargeting uses hierarchical parent-space FK transforms. Dynamic foot planting/ground IK is handled at game engine runtime if needed. | Post-Spike Engine Integration |
| **Mesh Deformation & Skinning (Weights)** | Style-B characters are strictly 2D planar sliced sprite attachments (rigid slot-to-bone binding). Deformable meshes introduce huge asset creation cost and break deterministic retargeting. | Out of Scope for Style-B Contract |
| **Animation State Machine & Transitions** | State blending, crossfades, and locomotion transitions are game engine runtime responsibilities (e.g., Unity/Unreal/Godot), not character setup tool responsibilities. | Game Engine Runtime Package |
| **Automatic AI Segmentation & Auto-Rigging** | AI-based visual segmentation and auto-pivot guessing produce inconsistent results and lack mechanical verification guarantees. Human-guided adjustment with live validation takes $< 2$ minutes per character. | Future R&D Experiment |
| **Cloud Synchronization / Collaborative Editing** | Characters and rigs are version-controlled via Git in plain JSON formats (`fixtures/` and asset repos). Cloud sync introduces server maintenance and conflict resolution complexity. | Out of Scope |

---

## 3. Boundary Invariant

If a future task or feature proposal attempts to introduce timeline keyframes, curve tangent handles, or vertex weight painting into `apps/editor/`, it violates the minimal rig adjustment contract. The tool must remain strictly a **bounded setup calibrator and family compliance verifier**.

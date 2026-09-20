# Phase B: Minimal Rig Adjuster — Test Plan & Verification Strategy

## 1. Test Levels & Coverage Strategy

The test plan for Phase B encompasses three distinct verification layers:

1. **Headless Model & History Unit Tests** (`apps/editor/tests/editor-model.test.ts`):
   Runs in pure Node/Vitest. Validates state transitions, command execution, undo/redo stacks, and transaction coalescing.
2. **Interactive UI & Live Validation Integration**:
   Verifies that user interactions in the editor correctly feed into the Phase A/A.1 validation engine and produce identical issue codes and metrics.
3. **Pipeline Parity & End-to-End Build Verification**:
   Ensures that JSON exported from the editor compiles deterministically with `@animation-factory/compiler` and executes with numerical parity in `@animation-factory/runtime-pixi`.

---

## 2. Test Cases & Verification Matrix

| Test Suite / ID | Component Under Test | Invariant / Target Behavior | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | `SetBoneOverrideCommand` | Applying command updates `character.bone_setup_overrides` and recomputes live validation. | Bone offset updated; validation matches; undo removes override cleanly. | **PASSED** |
| **MOD-02** | `HistoryManager` Coalescing | 50 continuous pointer move events inside `beginTransaction()` / `commitTransaction()`. | Exactly 1 entry on `undoStack`; 1 undo reverts all 50 steps; 1 redo restores end state. | **PASSED** |
| **MOD-03** | `SetSlotBoneCommand` | Reassigning a slot's parent bone updates slot mapping and triggers validation. | Slot parent updated; undo restores previous parent. | **PASSED** |
| **MOD-04** | `ChangeFamilyCommand` | Switching target rig family updates target envelope and re-evaluates all issues. | Active rig & envelope switched; issues updated against new contract; undo reverts family cleanly. | **PASSED** |
| **MOD-05** | `SessionMetricsTracker` | Tracking editing operations, commands, undo/redo, and active editing duration. | All counters increment accurately; duration tracks wall time. | **PASSED** |
| **INT-01** | `ValidatorPanel` | Live display of `ValidationIssue[]`, `material_override_ratio`, and compliance state. | Reflects validator output; clicking issue selects bone or slot target. | **PASSED** |
| **INT-02** | `FamilyFitPanel` | Real-time multi-family fit evaluation across `HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`. | Correctly scores and recommends optimal family based on proportions. | **PASSED** |
| **INT-03** | `Viewport` Handles | Interactive PixiJS canvas handles for pivot and distal anchor dragging. | Handles render in rig space; drag dispatches coalesced commands. | **PASSED** |
| **E2E-01** | Production Build | `tsc && vite build` on `apps/editor`. | Builds production bundle with zero type errors and zero warnings. | **PASSED** |
| **E2E-02** | Full Workspace Tests | `pnpm test` (all 13 test files, 53 tests). | All unit, parity, geometry, and challenge suites pass with zero failures. | **PASSED** |
| **E2E-03** | Lint & Formatting | `pnpm lint` across workspace. | Zero lint errors or warnings. | **PASSED** |

---

## 3. Automated Test Execution Evidence

Full test execution log (`pnpm test`):
```text
Test Files  13 passed (13)
     Tests  53 passed (53)
  Start at  12:57:47
  Duration  31.97s

✓ tests/run-contact-geometry.test.ts (4 tests)
✓ tests/challenge-evaluation.test.ts (1 test)
✓ tests/slash-clearance-geometry.test.ts (3 tests)
✓ packages/compiler/tests/compiler.test.ts (3 tests)
✓ tests/family-challenge-evaluation.test.ts (1 test)
✓ apps/editor/tests/editor-model.test.ts (5 tests)
✓ packages/runtime-pixi/tests/parity.test.ts (4 tests)
✓ packages/validator/tests/family-validation.test.ts (4 tests)
✓ tests/family-calibration.test.ts (3 tests)
✓ packages/validator/tests/assets-integrity.test.ts (5 tests)
✓ packages/validator/tests/validator.test.ts (6 tests)
✓ packages/anim-core/tests/anim-core.test.ts (11 tests)
✓ tests/calibration.test.ts (3 tests)
```

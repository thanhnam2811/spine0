# Phase A.1 Closure Report: Verification & Repository Hygiene Audit

- **Date**: 2026-09-20
- **Status**: VERIFIED
- **Closure Verdict**: **PHASE A.1 CLOSURE PASS**
- **Repository**: [https://github.com/thanhnam2811/spine0](https://github.com/thanhnam2811/spine0)
- **Base Commit**: `ea45ef3`
- **Verification Environment**: Windows 11, Node.js v24.19.0, pnpm v11.22.0, Vitest v3.2.7, ESLint v9.39.5, TypeScript v5.7.3 / v5.9.3

---

## 1. Executive Summary

Prior to proceeding to Phase B (Minimal Rig Adjuster), a comprehensive audit of Phase A.1 findings (A through F) was executed against the repository. All verification and hygiene gaps have been resolved with observed, executable evidence:
1. **Run Contact Geometry (Finding A)**: Analyzed stance-phase vertical geometry and documented V0 kinematic scope (pure FK keyframe/delta blending without IK foot-locking). Verified that the Small rig-family run template eliminates the 40.5px floating gap observed in Phase A single-rig chibi evaluation.
2. **Slash Clearance Geometry (Finding B)**: Implemented lightweight geometric proxies (`Point2D`, `Segment2D`, `CircleProxy`) and clearance testing in `packages/anim-core/src/clearance.ts`. Verified that Heavy slash clears the 45px shoulder pauldron proxy (clearance distance > 40px) and Small slash clears the 70px cranial dome proxy (clearance distance > 30px).
3. **Family Runtime Parity (Finding C)**: Verified numerical parity (`evaluator pose === compiled runtime pose`, tolerance $< 10^{-4}$) across all 3 rig families (`normal-01`, `heavy-01`, `small-01`) for `idle`, `run`, and `slash`.
4. **Asset Ambiguity & Source of Truth (Finding D)**: Established structured family subdirectories (`assets/rigs/<family-id>/` and `assets/animations/<family>/`) as the authoritative source of truth matching `phase-a1-freeze-manifest.json`. Documented root files in `assets/README.md` as legacy compatibility aliases and created cryptographic test `packages/validator/tests/assets-integrity.test.ts` asserting bit-for-bit identity.
5. **Repository Hygiene (Finding E)**: Removed tracked build artifacts (`apps/preview/src/*.js` and `*.tsbuildinfo`) via `git rm`. Added `*.tsbuildinfo` to `.gitignore`. Configured `apps/preview/tsconfig.json` with `"noEmit": true`. Created flat `eslint.config.js` and verified `pnpm lint` passes with 0 errors.
6. **CI Workflow (Finding F)**: Hardened `.github/workflows/ci.yml` by enforcing `pnpm install --frozen-lockfile` and adding an automated `pnpm lint` step.

Total test count increased from 35 tests to **48 tests across 12 test files**, all passing with exit code 0.

---

## 2. Findings Audit & Verification Evidence

### Finding A: Run Ground Contact Geometry & Stance Analysis
- **Observed Behavior**:
  - Ground reference line: $Y = 1000.0\text{px}$.
  - During stance phase ($t=0.2$ and $t=0.4$ for `foot_L`, $t=0.6$ for `foot_R`), support ankle $Y$ coordinates fall within the anatomical band $[880, 950]\text{px}$. With sole/foot height ($50\text{px}$), the sole reaches the ground reference line.
  - In Small family (`small-01` with `humanoid-small-v1` rig and `run-small` animation), support ankle reaches $Y = 947.58\text{px}$. In Phase A single-rig evaluation (`test-e` with canonical normal run), the ankle hovered at $Y = 907.04\text{px}$. The Small family template lowers the stance foot by $40.54\text{px}$, eliminating the floating artifact.
- **Architectural Scope Clarification**:
  - V0 kinematics is strictly FK keyframe/delta-based. Stance foot exhibits natural horizontal translation displacement because no IK constraint/foot-lock solver exists in V0. This is an intentional V0 boundary, explicitly documented and guarded in tests.
- **Verification Suite**: `tests/run-contact-geometry.test.ts` (4/4 tests passed).

### Finding B: Slash Clearance Geometry & Proxy Model
- **Implementation**: Created `packages/anim-core/src/clearance.ts` providing:
  - `Point2D`, `Segment2D`, `CircleProxy`, `ClearanceResult`.
  - `distancePointToSegment(point, segment)`: analytical closest-point projection.
  - `checkSegmentCircleClearance(segment, circle)`: checks whether segment intersects circle surface and returns penetration depth or clearance margin.
  - `computeWeaponSegment(handPose, bladeLength, baseOffset)`: constructs oriented 2D blade segment along hand rotation axis.
- **Observed Clearance Metrics**:
  - **Heavy Pauldron Clearance**: For `heavy-01` with shoulder pauldron circle proxy ($R=45\text{px}$ at `upper_arm_R`), the 120px weapon segment maintains positive clearance across all keyframes ($t \in [0.0, 0.75]$), with minimum safety margin of $183.9\text{px} > 40\text{px}$ and $0\text{px}$ penetration.
  - **Small Cranial Clearance**: For `small-01` with cranial dome circle proxy ($R=70\text{px}$ at `head`), the 70px weapon segment maintains positive clearance across all keyframes, with minimum safety margin of $104.9\text{px} > 30\text{px}$ and $0\text{px}$ penetration.
- **Verification Suite**: `tests/slash-clearance-geometry.test.ts` (3/3 tests passed).

### Finding C: Family Runtime Parity
- **Observed Behavior**:
  - Full numerical parity was evaluated between direct kinematic evaluation (`evaluator.sample`) and runtime baked clip evaluation (`sampleCompiledCharacter`):
    - `normal-01` with `humanoid-normal-v1` on `idle`, `run-normal`, `slash-normal`.
    - `heavy-01` with `humanoid-heavy-v1` on `idle`, `run-heavy`, `slash-heavy`.
    - `small-01` with `humanoid-small-v1` on `idle`, `run-small`, `slash-small`.
  - Tested across sample points $t \in [0.0, 0.2, 0.4, 0.6]$.
  - For all 17 bones and 11 slots in each family:
    - $\Delta \text{worldX} < 10^{-4}$
    - $\Delta \text{worldY} < 10^{-4}$
    - $\Delta \text{worldRotation} < 10^{-4}$
    - Slot draw order identical.
- **Verification Suite**: `packages/runtime-pixi/tests/parity.test.ts` (4/4 tests passed).

### Finding D: Asset Ambiguity & Source of Truth
- **Resolution**:
  - Canonical source of truth: structured subdirectories matching `docs/spike-results/phase-a1-freeze-manifest.json`:
    - `assets/rigs/humanoid-normal-v1/`
    - `assets/rigs/humanoid-heavy-v1/`
    - `assets/rigs/humanoid-small-v1/`
    - `assets/animations/shared/idle.anim.json`
    - `assets/animations/normal/`
    - `assets/animations/heavy/`
    - `assets/animations/small/`
  - Legacy root files are documented in `assets/README.md` as backward compatibility mirrors.
  - Created cryptographic test asserting all 6 root rig/envelope files and `idle.anim.json` match their canonical counterparts bit-for-bit, and asserting legacy `run.anim.json` and `slash.anim.json` match Phase A historical hashes.
- **Verification Suite**: `packages/validator/tests/assets-integrity.test.ts` (5/5 tests passed).

### Finding E: Repository Hygiene
- **Actions Taken**:
  - Executed `git rm` on tracked build outputs: `apps/preview/src/App.js`, `Controls.js`, `Viewport.js`, `main.js` and all 6 `*.tsbuildinfo` files.
  - Updated `.gitignore` to include `*.tsbuildinfo`.
  - Added `"noEmit": true` to `apps/preview/tsconfig.json` to prevent TypeScript project references from dumping transpiled `.js` files into source directories.
  - Created flat `eslint.config.js` compatible with ESLint 9.
  - Updated `package.json` lint script to `eslint --no-error-on-unmatched-pattern packages/ apps/`.
- **Verification**: `pnpm lint` and `pnpm typecheck` pass with 0 errors.

### Finding F: CI Workflow Hardening
- **Actions Taken**:
  - Updated `.github/workflows/ci.yml`:
    - Changed `pnpm install --frozen-lockfile=false` to `pnpm install --frozen-lockfile`.
    - Added automated `pnpm lint` step before typecheck and tests.
- **Verification**: Local run of `pnpm install --frozen-lockfile` completed in 1.3s with exit code 0.

---

## 3. Test Suite Summary Table

| Test Suite File | Tests Passed | Focus Area |
| :--- | :--- | :--- |
| `packages/validator/tests/assets-integrity.test.ts` | 5 / 5 | Freeze manifest SHA-256 hashes & alias bit-for-bit identity |
| `packages/anim-core/tests/anim-core.test.ts` | 11 / 11 | Math, setup resolution, rotation delta, translation delta |
| `tests/run-contact-geometry.test.ts` | 4 / 4 | Stance foot vertical coordinate, swing clearance, Small float closure, FK scope |
| `tests/slash-clearance-geometry.test.ts` | 3 / 3 | Heavy pauldron clearance, Small cranial clearance, Phase A single-rig defect repro |
| `packages/compiler/tests/compiler.test.ts` | 3 / 3 | Deterministic compilation and golden output |
| `tests/family-challenge-evaluation.test.ts` | 1 / 1 | 6 untouched holdout characters across 3 rig families |
| `packages/validator/tests/family-validation.test.ts` | 4 / 4 | Family assignment validation, cross-family envelope rejection |
| `packages/runtime-pixi/tests/parity.test.ts` | 4 / 4 | Evaluator vs PixiJS compiled runtime parity (1e-4) across 3 families |
| `packages/validator/tests/validator.test.ts` | 6 / 6 | Character validation, bone overrides, part slot binding |
| `tests/calibration.test.ts` | 3 / 3 | Phase A calibration character validation |
| `tests/family-calibration.test.ts` | 3 / 3 | Phase A.1 family calibration character validation |
| `tests/challenge-evaluation.test.ts` | 1 / 1 | Phase A historical challenge evaluation baseline |
| **Total** | **48 / 48** | **All suites passed cleanly (exit code 0)** |

---

## 4. Closure Gate Verdict

```text
============================================================
              PHASE A.1 CLOSURE PASS
============================================================
All verification gaps, geometric proxy models, runtime parity
benchmarks, asset ambiguity resolutions, and hygiene defects
have been closed with observed evidence and clean test passes.
Authorization granted to proceed to Phase B (Minimal Rig Adjuster).
============================================================
```

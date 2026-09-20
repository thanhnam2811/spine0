# 2D Character Animation Factory (Style-B R&D Spike)

An engineering research spike evaluating whether Style-B 2D game humanoid characters conforming to a controlled art contract can reuse shared skeletal animation templates without character-specific keyframing.

---

## Architecture Overview

```text
animation-factory/
├── apps/
│   ├── editor/             # Vite + React + PixiJS 8 Minimal Rig Adjuster (Phase B)
│   └── preview/            # Vite + React + PixiJS 8 Diagnostic Preview
├── packages/
│   ├── schema/             # Pure TypeScript interfaces & constants for Rigs, Characters, Animations
│   ├── anim-core/          # Headless FK engine, shortest-angle interpolation, dynamic draw order
│   ├── validator/          # Integrity validator with stable codes (ART_*, SPEC_*, RIG_*, ANIM_*)
│   ├── compiler/           # Deterministic compiler (SOURCE -> RUNTIME format)
│   └── runtime-pixi/       # PixiJS 8 renderer adapter & numerical runtime parity suite
├── assets/
│   ├── rigs/               # Canonical humanoid-normal-v1 rig & anatomy envelope
│   └── animations/         # Shared templates: idle.anim.json, run.anim.json, slash.anim.json
├── fixtures/
│   ├── calibration/        # dev-a, dev-b, dev-c (development & training set)
│   ├── challenge/          # test-a, test-b, test-c, test-d, test-e (untouched holdout set)
│   └── expected/           # Deterministic pose & runtime compiler goldens
└── docs/
    ├── research/           # github-references.md (bounded research across 5 repos)
    ├── specs/              # Style-B rig, art contract, anatomy envelope, format specs
    └── spike-results/      # Methodology, freeze manifest, challenge matrix, results
```

---

## Experimental Protocol & Findings

1. **Protocol Separation**: Development and envelope calibration used fixtures `dev-a`, `dev-b`, `dev-c`. All rig structures, animations, and ratios were then cryptographically frozen in [`docs/spike-results/freeze-manifest.json`](file:///G:/PERSONAL/spine0/docs/spike-results/freeze-manifest.json).
2. **Untouched Challenge Set**: Independent fixtures `test-a` through `test-e` were evaluated strictly without altering frozen assets.
3. **Outcome**: **`RIG-FAMILY ENGINEERING PASS`**
   - **Phase A**: Single-rig hypothesis was falsified by proportion outliers (`test-c` and `test-e`). Multi-family system proposed.
   - **Phase A.1 Independent Verification**: Phase A challenge fixtures (`test-c`, `test-e`) were moved to family calibration. Rig profiles, envelopes, and animation templates for `HumanoidNormal`, `HumanoidHeavy`, and `HumanoidSmall` were cryptographically frozen in [`docs/spike-results/phase-a1-freeze-manifest.json`](file:///G:/PERSONAL/spine0/docs/spike-results/phase-a1-freeze-manifest.json).
   - **Fresh Holdout Results**: Brand-new untouched holdout set (`normal-01`, `normal-02`, `heavy-01`, `heavy-02`, `small-01`, `small-02`) achieved 100% animation reuse, 100% boundary discrimination, and sub-6% material override ratio.
   - **Phase B Outcome**: **`PHASE B — MINIMAL RIG ADJUSTER: PASS`**. Headless document model, transaction-coalescing history, interactive bone/anchor adjustment handles, live multi-family fit panel, contract validator, and preview player delivered with 100% test coverage.
   - **Phase B.2 Outcome**: **`PHASE B.2 USABILITY-READY PASS`**. Production-grade dark desktop interface with Tailwind CSS, hierarchical tree navigation with instant search, dual numeric/slider inspector with nominal deltas, floating viewport HUD with camera reset, and session telemetry tracker.
   - **Phase C Outcome**: **`ENGINEERING / SYNTHETIC PRODUCTION HARNESS PASS`**. Synthetic multi-part character package ingestion, 27-scenario animation matrix, runtime PIXI parity, and compiler verification passed.
   - **Phase C.1 Status**: **`STAGE 1 REAL ASSET PACKAGE — ENGINEERING HARDENING COMPLETE / HUMAN GATE READY`** (Trial Verdict: `INCONCLUSIVE — HUMAN EVIDENCE MISSING`). Real Style-B assets generated (48 textures across 3 archetypes), integrity & asymmetry cryptographically verified, pixel cutouts validated (> 19% transparent background, > 35% opaque art), and registered in editor with interactive visual sprite pipeline. Telemetry lifecycle and gate mechanics hardened; halted at Human Gate for operator calibration sessions and visual seam/bleed inspection (`HUMAN_VISUAL_GATE_REQUIRED`).

*For Phase A/A.1 data and analysis, see [docs/spike-results/phase-a1-results.md](file:///G:/PERSONAL/spine0/docs/spike-results/phase-a1-results.md).*
*For Phase B documentation, see [docs/phase-b/results.md](file:///G:/PERSONAL/spine0/docs/phase-b/results.md) and [docs/phase-b/ui-completion.md](file:///G:/PERSONAL/spine0/docs/phase-b/ui-completion.md).*
*For Phase C documentation, see [docs/phase-c/results.md](file:///G:/PERSONAL/spine0/docs/phase-c/results.md).*
*For Phase C.1 documentation, see [docs/phase-c1/results.md](file:///G:/PERSONAL/spine0/docs/phase-c1/results.md) and [docs/phase-c1/stage1-results.md](file:///G:/PERSONAL/spine0/docs/phase-c1/stage1-results.md).*

---

## Quick Start & Verification

### Install Dependencies
```bash
pnpm install
```

### Run All Verification Tests
Runs unit tests, validator checks, compiler goldens, pose goldens, runtime parity checks, and challenge set evaluations:
```bash
pnpm test
```

### Typecheck & Lint
```bash
pnpm typecheck
pnpm lint
```

### Launch Minimal Rig Adjuster (Phase B)
```bash
pnpm editor
```
Open `http://localhost:5174` to interactively calibrate bone pivots, distal anchors, slot assignments, live family fits, and preview animation retargeting.

### Launch Diagnostic Preview (Phase A)
```bash
pnpm preview
```
Open `http://localhost:5173` to interactively inspect character fixtures, clip playback, bone hierarchies, joint pivots, and dynamic draw orders.

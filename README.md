# 2D Character Animation Factory (Style-B R&D Spike)

An engineering research spike evaluating whether Style-B 2D game humanoid characters conforming to a controlled art contract can reuse shared skeletal animation templates without character-specific keyframing.

---

## Architecture Overview

```text
animation-factory/
├── apps/
│   └── preview/            # Vite + React + PixiJS 8 Diagnostic Preview (NO editor in Phase A)
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
   - **Phase B Authorized**: Proceed to Minimal Rig Adjuster.

*For detailed data and analysis, see [docs/spike-results/phase-a1-results.md](file:///G:/PERSONAL/spine0/docs/spike-results/phase-a1-results.md), [docs/spike-results/phase-a1-methodology.md](file:///G:/PERSONAL/spine0/docs/spike-results/phase-a1-methodology.md), and [docs/spike-results/phase-a1-family-matrix.md](file:///G:/PERSONAL/spine0/docs/spike-results/phase-a1-family-matrix.md).*

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

### Typecheck
```bash
pnpm typecheck
```

### Launch Diagnostic Preview
```bash
pnpm preview
```
Open `http://localhost:5173` to interactively inspect character fixtures, clip playback, bone hierarchies, joint pivots, and dynamic draw orders.

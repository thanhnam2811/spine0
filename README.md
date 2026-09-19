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
   - Single-rig hypothesis was falsified for heavy armored and chibi outliers.
   - 17-bone topology + Rig Families (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) delivered high-efficiency animation reuse.
   - Phase B (Minimal Rig Adjuster) is authorized and recommended.

*For detailed data and analysis, see [docs/spike-results/results.md](file:///G:/PERSONAL/spine0/docs/spike-results/results.md) and [docs/spike-results/phase-a-supervisor-report.md](file:///G:/PERSONAL/spine0/docs/spike-results/phase-a-supervisor-report.md).*

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

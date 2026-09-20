# Animation Factory — Asset Hierarchy & Source of Truth

This directory contains the frozen skeletal rigs, anatomy envelopes, and animation templates used across Phase A and Phase A.1.

## 1. Canonical Source of Truth (Phase A.1 Rig Families)

As verified in Phase A.1 and frozen in `docs/spike-results/phase-a1-freeze-manifest.json`, the authoritative sources of truth for all production assets are the structured family subdirectories:

### Rigs & Anatomy Envelopes
- `assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json`: Authoritative rig definition for the **HumanoidNormal** family.
- `assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json`: Authoritative bounding envelope for Normal archetypes.
- `assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json`: Authoritative rig definition for the **HumanoidHeavy** family.
- `assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json`: Authoritative bounding envelope for Heavy archetypes.
- `assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json`: Authoritative rig definition for the **HumanoidSmall** family.
- `assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json`: Authoritative bounding envelope for Small archetypes.

### Animation Templates
- `assets/animations/shared/idle.anim.json`: Authoritative shared template (`idle`) applied universally across all families.
- `assets/animations/normal/run.anim.json` & `slash.anim.json`: Authoritative family-specific templates for HumanoidNormal.
- `assets/animations/heavy/run.anim.json` & `slash.anim.json`: Authoritative family-specific templates for HumanoidHeavy.
- `assets/animations/small/run.anim.json` & `slash.anim.json`: Authoritative family-specific templates for HumanoidSmall.

## 2. Legacy Compatibility Aliases (Root Level)

For backward compatibility with early Phase A single-rig runners and tooling:
- `assets/rigs/*.rig.json` and `assets/rigs/*.envelope.json` at the root of `assets/rigs/` are identical bit-for-bit mirrors of their canonical family counterparts in `assets/rigs/<family-id>/`.
- `assets/animations/idle.anim.json` is an identical bit-for-bit mirror of `assets/animations/shared/idle.anim.json`.
- `assets/animations/run.anim.json` and `assets/animations/slash.anim.json` at the root of `assets/animations/` preserve the Phase A baseline clips (IDs `run` and `slash`, SHA-256 hashes recorded in `docs/spike-results/results.md`) utilized by regression test runners.

## 3. Cryptographic Verification

Integrity of all canonical and alias assets is continuously verified by `packages/validator/tests/assets-integrity.test.ts` against `docs/spike-results/phase-a1-freeze-manifest.json`.

import type {
  AnatomyEnvelope,
  AnimationTemplate,
  CharacterDefinition,
  RigDefinition
} from "@animation-factory/schema";

// Canonical Rigs
import normalRig from "../../../assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json";
import heavyRig from "../../../assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json";
import smallRig from "../../../assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json";

// Canonical Envelopes
import normalEnvelope from "../../../assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json";
import heavyEnvelope from "../../../assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json";
import smallEnvelope from "../../../assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json";

// Canonical Animation Templates
import idleAnim from "../../../assets/animations/shared/idle.anim.json";
import normalRun from "../../../assets/animations/normal/run.anim.json";
import normalSlash from "../../../assets/animations/normal/slash.anim.json";
import heavyRun from "../../../assets/animations/heavy/run.anim.json";
import heavySlash from "../../../assets/animations/heavy/slash.anim.json";
import smallRun from "../../../assets/animations/small/run.anim.json";
import smallSlash from "../../../assets/animations/small/slash.anim.json";

// Preset Characters - Phase A.1 Benchmarks
import normal01 from "../../../fixtures/family-challenge/normal-01/character.json";
import normal02 from "../../../fixtures/family-challenge/normal-02/character.json";
import heavy01 from "../../../fixtures/family-challenge/heavy-01/character.json";
import heavy02 from "../../../fixtures/family-challenge/heavy-02/character.json";
import small01 from "../../../fixtures/family-challenge/small-01/character.json";
import small02 from "../../../fixtures/family-challenge/small-02/character.json";
import devA from "../../../fixtures/calibration/dev-a/character.json";
import testC from "../../../fixtures/challenge/test-c/character.json";
import testE from "../../../fixtures/challenge/test-e/character.json";

// Preset Characters - Phase C Production Trial (Real Style-B Art)
import trialNormal01 from "../../../fixtures/production-trial/normal-01/character.json";
import trialNormal02 from "../../../fixtures/production-trial/normal-02/character.json";
import trialNormal03 from "../../../fixtures/production-trial/normal-03/character.json";
import trialHeavy01 from "../../../fixtures/production-trial/heavy-01/character.json";
import trialHeavy02 from "../../../fixtures/production-trial/heavy-02/character.json";
import trialHeavy03 from "../../../fixtures/production-trial/heavy-03/character.json";
import trialSmall01 from "../../../fixtures/production-trial/small-01/character.json";
import trialSmall02 from "../../../fixtures/production-trial/small-02/character.json";
import trialSmall03 from "../../../fixtures/production-trial/small-03/character.json";

export const PRESET_RIGS: Record<string, RigDefinition> = {
  "humanoid-normal-v1": normalRig as unknown as RigDefinition,
  "humanoid-heavy-v1": heavyRig as unknown as RigDefinition,
  "humanoid-small-v1": smallRig as unknown as RigDefinition
};

export const PRESET_ENVELOPES: Record<string, AnatomyEnvelope> = {
  "humanoid-normal-v1": normalEnvelope as unknown as AnatomyEnvelope,
  "humanoid-heavy-v1": heavyEnvelope as unknown as AnatomyEnvelope,
  "humanoid-small-v1": smallEnvelope as unknown as AnatomyEnvelope
};

export const PRESET_ANIMATIONS: Record<string, Record<string, AnimationTemplate>> = {
  "humanoid-normal-v1": {
    idle: idleAnim as unknown as AnimationTemplate,
    run: normalRun as unknown as AnimationTemplate,
    slash: normalSlash as unknown as AnimationTemplate
  },
  "humanoid-heavy-v1": {
    idle: idleAnim as unknown as AnimationTemplate,
    run: heavyRun as unknown as AnimationTemplate,
    slash: heavySlash as unknown as AnimationTemplate
  },
  "humanoid-small-v1": {
    idle: idleAnim as unknown as AnimationTemplate,
    run: smallRun as unknown as AnimationTemplate,
    slash: smallSlash as unknown as AnimationTemplate
  }
};

export const PRESET_CHARACTERS: Record<string, CharacterDefinition> = {
  // Phase C Production Trial
  "trial-normal-01": trialNormal01 as unknown as CharacterDefinition,
  "trial-normal-02": trialNormal02 as unknown as CharacterDefinition,
  "trial-normal-03": trialNormal03 as unknown as CharacterDefinition,
  "trial-heavy-01": trialHeavy01 as unknown as CharacterDefinition,
  "trial-heavy-02": trialHeavy02 as unknown as CharacterDefinition,
  "trial-heavy-03": trialHeavy03 as unknown as CharacterDefinition,
  "trial-small-01": trialSmall01 as unknown as CharacterDefinition,
  "trial-small-02": trialSmall02 as unknown as CharacterDefinition,
  "trial-small-03": trialSmall03 as unknown as CharacterDefinition,

  // Phase A.1 Benchmarks
  "normal-01": normal01 as unknown as CharacterDefinition,
  "normal-02": normal02 as unknown as CharacterDefinition,
  "heavy-01": heavy01 as unknown as CharacterDefinition,
  "heavy-02": heavy02 as unknown as CharacterDefinition,
  "small-01": small01 as unknown as CharacterDefinition,
  "small-02": small02 as unknown as CharacterDefinition,
  "dev-a": devA as unknown as CharacterDefinition,
  "test-c": testC as unknown as CharacterDefinition,
  "test-e": testE as unknown as CharacterDefinition
};

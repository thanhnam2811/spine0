import type {
  DrawOrderKey,
  RotationKeyframe,
  SlotDefinition,
  TranslationKeyframe
} from "@animation-factory/schema";
import { clamp, lerp, shortestAngleDelta, solveCubicBezier } from "./math.js";

/**
 * Normalizes timeline time according to looping and clip duration.
 */
export function normalizeTime(time: number, duration: number, loop: boolean): number {
  if (duration <= 0.0) return 0.0;
  if (!loop) {
    return clamp(time, 0.0, duration);
  }
  const mod = time % duration;
  return mod < 0.0 ? mod + duration : mod;
}

/**
 * Computes interpolation progress [0, 1] between keyframes given curve parameters.
 */
function computeKeyframeProgress(
  t: number,
  t0: number,
  t1: number,
  curve?: string,
  bezier?: [number, number, number, number]
): number {
  if (t1 <= t0) return 1.0;
  const rawT = clamp((t - t0) / (t1 - t0), 0.0, 1.0);

  if (curve === "step") {
    return 0.0;
  }

  if (curve === "bezier" && bezier && bezier.length === 4) {
    return solveCubicBezier(bezier[0], bezier[1], bezier[2], bezier[3], rawT);
  }

  return rawT; // linear
}

/**
 * Samples a rotation delta track at normalized time t.
 * Returns delta angle in degrees relative to setup rotation.
 */
export function sampleRotationTrack(
  keyframes: RotationKeyframe[] | undefined,
  t: number
): number {
  if (!keyframes || keyframes.length === 0) {
    return 0.0;
  }

  if (keyframes.length === 1 || t <= keyframes[0].time) {
    return keyframes[0].rotationDelta;
  }

  const last = keyframes[keyframes.length - 1];
  if (t >= last.time) {
    return last.rotationDelta;
  }

  // Find enclosing interval [i, i+1]
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    if (t >= k0.time && t <= k1.time) {
      const progress = computeKeyframeProgress(t, k0.time, k1.time, k0.curve, k0.bezier);
      const angleDelta = shortestAngleDelta(k0.rotationDelta, k1.rotationDelta);
      return k0.rotationDelta + angleDelta * progress;
    }
  }

  return last.rotationDelta;
}

/**
 * Samples a translation delta track at normalized time t.
 * Scales normalized offsets by basis ('selfBone' or 'characterHeight') into pixels.
 */
export function sampleTranslationTrack(
  keyframes: TranslationKeyframe[] | undefined,
  t: number,
  boneLength: number,
  referenceHeight: number
): [number, number] {
  if (!keyframes || keyframes.length === 0) {
    return [0.0, 0.0];
  }

  let deltaX = 0.0;
  let deltaY = 0.0;
  let basis = keyframes[0].basis;

  if (keyframes.length === 1 || t <= keyframes[0].time) {
    deltaX = keyframes[0].deltaX;
    deltaY = keyframes[0].deltaY;
    basis = keyframes[0].basis;
  } else {
    const last = keyframes[keyframes.length - 1];
    if (t >= last.time) {
      deltaX = last.deltaX;
      deltaY = last.deltaY;
      basis = last.basis;
    } else {
      for (let i = 0; i < keyframes.length - 1; i++) {
        const k0 = keyframes[i];
        const k1 = keyframes[i + 1];
        if (t >= k0.time && t <= k1.time) {
          const progress = computeKeyframeProgress(t, k0.time, k1.time, k0.curve, k0.bezier);
          deltaX = lerp(k0.deltaX, k1.deltaX, progress);
          deltaY = lerp(k0.deltaY, k1.deltaY, progress);
          basis = k0.basis;
          break;
        }
      }
    }
  }

  const scale = basis === "selfBone" ? boneLength : referenceHeight;
  return [deltaX * scale, deltaY * scale];
}

/**
 * Resolves active draw orders for all slots at time t.
 */
export function sampleDrawOrder(
  slots: SlotDefinition[],
  drawOrderKeys: DrawOrderKey[] | undefined,
  t: number
): { activeOrders: Record<string, number>; sortedSlotIds: string[] } {
  const activeOrders: Record<string, number> = {};

  // 1. Initialize from defaultDrawOrder
  for (const slot of slots) {
    activeOrders[slot.id] = slot.defaultDrawOrder;
  }

  // 2. Apply keyed overrides up to time t
  if (drawOrderKeys && drawOrderKeys.length > 0) {
    // Sort keys by time ascending
    const sortedKeys = [...drawOrderKeys].sort((a, b) => a.time - b.time);
    for (const key of sortedKeys) {
      if (key.time <= t) {
        activeOrders[key.slot] = key.drawOrder;
      }
    }
  }

  // 3. Sort slot IDs by active draw order ascending
  const sortedSlotIds = slots
    .map((s) => s.id)
    .sort((a, b) => {
      const diff = (activeOrders[a] ?? 0) - (activeOrders[b] ?? 0);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });

  return { activeOrders, sortedSlotIds };
}

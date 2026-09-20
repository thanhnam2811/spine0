/**
 * clearance.ts - Geometric clearance and proxy collision testing
 *
 * Used for verifying that dynamic weapon arcs and limb trajectories
 * do not intersect bulky armor (e.g. Heavy pauldrons) or anatomical features
 * (e.g. Small / Chibi oversized cranial dome).
 */

import { degToRad } from "./math.js";

export interface Point2D {
  x: number;
  y: number;
}

export interface Segment2D {
  p1: Point2D;
  p2: Point2D;
}

export interface CircleProxy {
  name?: string;
  center: Point2D;
  radius: number;
}

export interface ClearanceResult {
  hasClearance: boolean; // true if segment does NOT intersect circle
  distance: number;      // distance from segment to circle boundary (positive = clear, negative = penetrating)
  closestPoint: Point2D; // point on segment closest to circle center
  penetration: number;   // penetration depth into circle (0 if clear)
}

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distancePointToSegment(
  point: Point2D,
  segment: Segment2D
): { distance: number; closestPoint: Point2D } {
  const { p1, p2 } = segment;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-8) {
    const d = distance(point, p1);
    return { distance: d, closestPoint: { x: p1.x, y: p1.y } };
  }

  // Projection parameter t
  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
  t = Math.max(0.0, Math.min(1.0, t));

  const closestPoint: Point2D = {
    x: p1.x + t * dx,
    y: p1.y + t * dy
  };

  return {
    distance: distance(point, closestPoint),
    closestPoint
  };
}

export function checkSegmentCircleClearance(
  segment: Segment2D,
  circle: CircleProxy
): ClearanceResult {
  const { distance: dToCenter, closestPoint } = distancePointToSegment(circle.center, segment);
  const clearanceDist = dToCenter - circle.radius;
  const hasClearance = clearanceDist > 0.0;
  const penetration = hasClearance ? 0.0 : -clearanceDist;

  return {
    hasClearance,
    distance: clearanceDist,
    closestPoint,
    penetration
  };
}

export function segmentIntersectsCircle(segment: Segment2D, circle: CircleProxy): boolean {
  const { distance: dToCenter } = distancePointToSegment(circle.center, segment);
  return dToCenter < circle.radius;
}

/**
 * Computes a weapon line segment from a hand bone pose and weapon blade length.
 * The blade extends along the hand's orientation axis in local +Y.
 */
export function computeWeaponSegment(
  handPose: { worldX: number; worldY: number; worldRotation: number },
  bladeLength: number = 100.0,
  baseOffset: number = 0.0
): Segment2D {
  const rad = degToRad(handPose.worldRotation);
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);

  // In screen space (X+ right, Y+ down), local (0, L) rotated by rad:
  // x = -sin * L, y = cos * L
  const p1: Point2D = {
    x: handPose.worldX - sin * baseOffset,
    y: handPose.worldY + cos * baseOffset
  };
  const p2: Point2D = {
    x: handPose.worldX - sin * (baseOffset + bladeLength),
    y: handPose.worldY + cos * (baseOffset + bladeLength)
  };

  return { p1, p2 };
}

/**
 * math.ts - 2D math, affine matrix operations, angle normalization and bezier solving
 *
 * Screen Coordinate System:
 * - X+ points right
 * - Y+ points down
 * - Angles are specified in degrees (clockwise positive)
 */

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180.0;
}

export function radToDeg(radians: number): number {
  return (radians * 180.0) / Math.PI;
}

/**
 * Normalizes an angle in degrees to [0, 360).
 */
export function normalizeAngle(degrees: number): number {
  const mod = degrees % 360.0;
  return mod < 0 ? mod + 360.0 : mod;
}

/**
 * Calculates the shortest angular delta from fromDeg to toDeg in range [-180, 180].
 * Positive means clockwise, negative means counter-clockwise.
 */
export function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  let delta = (toDeg - fromDeg) % 360.0;
  if (delta > 180.0) {
    delta -= 360.0;
  } else if (delta < -180.0) {
    delta += 360.0;
  }
  return delta;
}

/**
 * Linearly interpolates between two angles along the shortest angular path.
 */
export function lerpAngle(fromDeg: number, toDeg: number, t: number): number {
  const delta = shortestAngleDelta(fromDeg, toDeg);
  return normalizeAngle(fromDeg + delta * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 2D Affine Transform Matrix representing:
 * [ a,  c,  tx ]
 * [ b,  d,  ty ]
 * [ 0,  0,   1 ]
 *
 * For rotation theta (CW) and translation (x, y):
 * a = cos(theta),  c = -sin(theta), tx = x
 * b = sin(theta),  d =  cos(theta), ty = y
 */
export interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export function createIdentityMatrix(): TransformMatrix {
  return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

export function createTransformMatrix(x: number, y: number, rotationDeg: number): TransformMatrix {
  const rad = degToRad(rotationDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    tx: x,
    ty: y
  };
}

/**
 * Multiplies two affine matrices: result = parent * child
 */
export function multiplyMatrices(parent: TransformMatrix, child: TransformMatrix): TransformMatrix {
  return {
    a: parent.a * child.a + parent.c * child.b,
    b: parent.b * child.a + parent.d * child.b,
    c: parent.a * child.c + parent.c * child.d,
    d: parent.b * child.c + parent.d * child.d,
    tx: parent.a * child.tx + parent.c * child.ty + parent.tx,
    ty: parent.b * child.tx + parent.d * child.ty + parent.ty
  };
}

/**
 * Transforms a 2D point [x, y] by the matrix.
 */
export function transformPoint(matrix: TransformMatrix, x: number, y: number): [number, number] {
  return [
    matrix.a * x + matrix.c * y + matrix.tx,
    matrix.b * x + matrix.d * y + matrix.ty
  ];
}

/**
 * Extracts rotation in degrees (clockwise) from an affine matrix.
 */
export function extractRotationDeg(matrix: TransformMatrix): number {
  const rad = Math.atan2(matrix.b, matrix.a);
  return normalizeAngle(radToDeg(rad));
}

/* -------------------------------------------------------------------------- */
/*  Cubic Bezier Timing Function                                              */
/* -------------------------------------------------------------------------- */

/**
 * Evaluates 1D cubic bezier coordinate for parameter u in [0, 1].
 * B(u) = 3(1-u)^2 * u * p1 + 3(1-u) * u^2 * p2 + u^3
 */
function sampleBezier(p1: number, p2: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  const inv = 1.0 - u;
  const inv2 = inv * inv;
  return 3.0 * inv2 * u * p1 + 3.0 * inv * u2 * p2 + u3;
}

function sampleBezierDerivative(p1: number, p2: number, u: number): number {
  const inv = 1.0 - u;
  return 3.0 * inv * inv * p1 + 6.0 * inv * u * (p2 - p1) + 3.0 * u * u * (1.0 - p2);
}

/**
 * Given cubic bezier handle parameters [x1, y1, x2, y2] and input progress x in [0, 1],
 * solves for progress y in [0, 1] using Newton-Raphson with bisection fallback.
 */
export function solveCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number
): number {
  if (x <= 0.0) return 0.0;
  if (x >= 1.0) return 1.0;

  // Newton-Raphson search for u such that sampleBezier(x1, x2, u) == x
  let u = x;
  for (let i = 0; i < 8; i++) {
    const currentX = sampleBezier(x1, x2, u) - x;
    if (Math.abs(currentX) < 1e-6) {
      return sampleBezier(y1, y2, u);
    }
    const dX = sampleBezierDerivative(x1, x2, u);
    if (Math.abs(dX) < 1e-6) break;
    u -= currentX / dX;
    if (u < 0.0 || u > 1.0) break;
  }

  // Bisection fallback
  let low = 0.0;
  let high = 1.0;
  u = x;
  while (low < high) {
    const currentX = sampleBezier(x1, x2, u);
    if (Math.abs(currentX - x) < 1e-5) {
      return sampleBezier(y1, y2, u);
    }
    if (x > currentX) {
      low = u;
    } else {
      high = u;
    }
    u = (high + low) * 0.5;
  }

  return sampleBezier(y1, y2, u);
}

import { ImageResult, OpticalMedium, RayPath, Vec2 } from "./types";

// ---------- Refractive indices ----------

export const REFRACTIVE_INDEX: Record<OpticalMedium, number> = {
  air: 1.0,
  water: 1.33,
  glass: 1.5,
  diamond: 2.42,
};

export const SPEED_OF_LIGHT = 3.0e8; // m/s

// ---------- Mirror / lens equation (shared form, per curriculum convention) ----------
// 1/f = 1/do + 1/di  =>  di = f*do / (do - f)
// M = hi/ho = -di/do

const NEAR_ZERO = 1e-6;

export function thinElementImage(f: number, objectDistance: number, objectHeight: number): ImageResult {
  const denom = objectDistance - f;
  const atInfinity = Math.abs(denom) < NEAR_ZERO;

  const imageDistance = atInfinity ? Infinity : (f * objectDistance) / denom;
  const magnification = atInfinity ? Infinity : -imageDistance / objectDistance;
  const imageHeight = atInfinity ? Infinity : magnification * objectHeight;

  const isReal = !atInfinity && imageDistance > 0;
  const isUpright = !atInfinity && magnification > 0;
  const absM = Math.abs(magnification);
  const sizeLabel = atInfinity ? "Magnified" : absM > 1.02 ? "Magnified" : absM < 0.98 ? "Diminished" : "Same size";

  return { imageDistance, imageHeight, magnification, isReal, isUpright, sizeLabel, atInfinity };
}

// ---------- Snell's law ----------

export interface RefractionResult {
  refractedAngleDeg: number | null; // null = total internal reflection
  criticalAngleDeg: number | null; // null if n1 <= n2 (TIR impossible)
  totalInternalReflection: boolean;
}

export function snellsLaw(n1: number, n2: number, incidentAngleDeg: number): RefractionResult {
  const criticalAngleDeg = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;
  const sinTheta2 = (n1 * Math.sin((incidentAngleDeg * Math.PI) / 180)) / n2;

  if (sinTheta2 > 1) {
    return { refractedAngleDeg: null, criticalAngleDeg, totalInternalReflection: true };
  }
  const refractedAngleDeg = (Math.asin(sinTheta2) * 180) / Math.PI;
  return { refractedAngleDeg, criticalAngleDeg, totalInternalReflection: false };
}

// ---------- Principal ray construction (paraxial approximation, standard textbook convention) ----------
// Element sits at x=0. Object top is at (-objectDistance, objectHeight).
// Mirrors: light re-enters the x<0 half after reflecting, so F and C are placed at x=-f and x=-2f
//   (this single convention correctly places them behind the mirror for convex, since f<0 there).
// Lenses: front focal at x=-|f|, back focal at x=+|f|; image position is di directly (signed).

function lineHitAtX0(p1: Vec2, p2: Vec2): Vec2 {
  const t = -p1.x / (p2.x - p1.x);
  return { x: 0, y: p1.y + t * (p2.y - p1.y) };
}

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function extend(from: Vec2, dir: Vec2, length: number): Vec2 {
  return { x: from.x + dir.x * length, y: from.y + dir.y * length };
}

const RAY_DRAW_LENGTH = 1000; // cm, generous so rays always reach the canvas edge

export function lensPrincipalRays(
  converging: boolean,
  fMag: number,
  objectDistance: number,
  objectHeight: number,
  image: ImageResult
): RayPath[] {
  const P: Vec2 = { x: -objectDistance, y: objectHeight };
  const O: Vec2 = { x: 0, y: 0 };
  const Ffront: Vec2 = { x: -fMag, y: 0 };
  const Fback: Vec2 = { x: fMag, y: 0 };
  const imageX = image.atInfinity ? (converging ? 1e6 : -1e6) : image.imageDistance;
  const Q: Vec2 = { x: imageX, y: image.atInfinity ? objectHeight * 1e6 : image.imageHeight };
  const isVirtual = !image.isReal && !image.atInfinity;

  const rays: RayPath[] = [];

  // 1. Parallel ray
  {
    const H: Vec2 = { x: 0, y: objectHeight };
    const dir = converging ? normalize({ x: Fback.x - H.x, y: Fback.y - H.y }) : normalize({ x: H.x - Ffront.x, y: H.y - Ffront.y });
    rays.push({
      label: "Parallel Ray",
      incidentFrom: P,
      incidentTo: H,
      outgoingFrom: H,
      outgoingTo: extend(H, dir, RAY_DRAW_LENGTH),
      virtualExtension: isVirtual ? { from: H, to: Q } : undefined,
    });
  }

  // 2. Focal ray
  {
    const aimPoint = converging ? Ffront : Fback;
    const H = lineHitAtX0(P, aimPoint);
    const dir = { x: 1, y: 0 };
    rays.push({
      label: "Focal Ray",
      incidentFrom: P,
      incidentTo: H,
      outgoingFrom: H,
      outgoingTo: extend(H, dir, RAY_DRAW_LENGTH),
      virtualExtension: isVirtual ? { from: H, to: Q } : undefined,
    });
  }

  // 3. Central ray (through optical center, undeviated)
  {
    const H = O;
    const dir = normalize({ x: O.x - P.x, y: O.y - P.y });
    rays.push({
      label: "Central Ray",
      incidentFrom: P,
      incidentTo: H,
      outgoingFrom: H,
      outgoingTo: extend(H, dir, RAY_DRAW_LENGTH),
      virtualExtension: isVirtual ? { from: H, to: Q } : undefined,
    });
  }

  return rays;
}

export function mirrorPrincipalRays(
  concave: boolean,
  fMag: number,
  objectDistance: number,
  objectHeight: number,
  image: ImageResult
): RayPath[] {
  const f = concave ? fMag : -fMag; // signed f, per convention
  const P: Vec2 = { x: -objectDistance, y: objectHeight };
  const F: Vec2 = { x: -f, y: 0 };
  const C: Vec2 = { x: -2 * f, y: 0 };
  const imageX = image.atInfinity ? (concave ? -1e6 : 1e6) : -image.imageDistance;
  const Q: Vec2 = { x: imageX, y: image.atInfinity ? objectHeight * 1e6 : image.imageHeight };
  const isVirtual = !image.isReal && !image.atInfinity;

  const rays: RayPath[] = [];

  // 1. Parallel ray -> reflects through/appears from F
  {
    const H: Vec2 = { x: 0, y: objectHeight };
    const dir = normalize({ x: F.x - H.x, y: F.y - H.y });
    rays.push({
      label: "Parallel Ray",
      incidentFrom: P,
      incidentTo: H,
      outgoingFrom: H,
      outgoingTo: extend(H, dir, RAY_DRAW_LENGTH),
      virtualExtension: isVirtual ? { from: H, to: Q } : undefined,
    });
  }

  // 2. Focal ray -> through/toward F, reflects parallel to axis
  {
    const H = lineHitAtX0(P, F);
    const dir = { x: -1, y: 0 };
    rays.push({
      label: "Focal Ray",
      incidentFrom: P,
      incidentTo: H,
      outgoingFrom: H,
      outgoingTo: extend(H, dir, RAY_DRAW_LENGTH),
      virtualExtension: isVirtual ? { from: H, to: Q } : undefined,
    });
  }

  // 3. Central ray -> through/toward C, reflects back along itself
  {
    const H = lineHitAtX0(P, C);
    const dir = normalize({ x: P.x - H.x, y: P.y - H.y });
    rays.push({
      label: "Central Ray",
      incidentFrom: P,
      incidentTo: H,
      outgoingFrom: H,
      outgoingTo: extend(H, dir, RAY_DRAW_LENGTH),
      virtualExtension: isVirtual ? { from: H, to: Q } : undefined,
    });
  }

  return rays;
}

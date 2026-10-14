import { ShapeDimensions, ShapeInfo, ShapeKind } from "./types";

export const DEFAULT_DIMENSIONS: Record<ShapeKind, ShapeDimensions> = {
  cube: { side: 2 },
  cuboid: { length: 3, width: 2, height: 1.5 },
  sphere: { radius: 1.2 },
  cylinder: { radius: 1, height: 2 },
  cone: { radius: 1, height: 2 },
  "triangular-prism": { side: 1.5, height: 2.5 },
  "square-pyramid": { side: 2, height: 2 },
  tetrahedron: { side: 1.8 },
  "pentagonal-prism": { side: 1, height: 2 },
  "hexagonal-prism": { side: 1, height: 2 },
  hemisphere: { radius: 1.3 },
  torus: { radius: 1.2, tubeRadius: 0.4 },
};

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  cube: "Cube",
  cuboid: "Cuboid",
  sphere: "Sphere",
  cylinder: "Cylinder",
  cone: "Cone",
  "triangular-prism": "Triangular Prism",
  "square-pyramid": "Square Pyramid",
  tetrahedron: "Tetrahedron",
  "pentagonal-prism": "Pentagonal Prism",
  "hexagonal-prism": "Hexagonal Prism",
  hemisphere: "Hemisphere",
  torus: "Torus",
};

/** Which dimension fields matter for each shape, for building the right sliders. */
export const SHAPE_DIMENSION_FIELDS: Record<ShapeKind, { key: keyof ShapeDimensions; label: string }[]> = {
  cube: [{ key: "side", label: "Side length" }],
  cuboid: [
    { key: "length", label: "Length" },
    { key: "width", label: "Width" },
    { key: "height", label: "Height" },
  ],
  sphere: [{ key: "radius", label: "Radius" }],
  cylinder: [
    { key: "radius", label: "Radius" },
    { key: "height", label: "Height" },
  ],
  cone: [
    { key: "radius", label: "Radius" },
    { key: "height", label: "Height" },
  ],
  "triangular-prism": [
    { key: "side", label: "Base side" },
    { key: "height", label: "Length" },
  ],
  "square-pyramid": [
    { key: "side", label: "Base side" },
    { key: "height", label: "Height" },
  ],
  tetrahedron: [{ key: "side", label: "Edge length" }],
  "pentagonal-prism": [
    { key: "side", label: "Base side" },
    { key: "height", label: "Length" },
  ],
  "hexagonal-prism": [
    { key: "side", label: "Base side" },
    { key: "height", label: "Length" },
  ],
  hemisphere: [{ key: "radius", label: "Radius" }],
  torus: [
    { key: "radius", label: "Ring radius" },
    { key: "tubeRadius", label: "Tube radius" },
  ],
};

function regularPolygonArea(nSides: number, side: number): number {
  return (nSides * side * side) / (4 * Math.tan(Math.PI / nSides));
}

export function computeShapeInfo(kind: ShapeKind, d: ShapeDimensions): ShapeInfo {
  const name = SHAPE_LABELS[kind];

  switch (kind) {
    case "cube": {
      const a = d.side ?? 1;
      return {
        name,
        faces: 6,
        edges: 12,
        vertices: 8,
        surfaceArea: 6 * a * a,
        volume: a * a * a,
        explanation: `A cube has 6 identical square faces, 12 edges, and 8 vertices. All edges are the same length (${a}).`,
      };
    }
    case "cuboid": {
      const l = d.length ?? 1;
      const w = d.width ?? 1;
      const h = d.height ?? 1;
      return {
        name,
        faces: 6,
        edges: 12,
        vertices: 8,
        surfaceArea: 2 * (l * w + l * h + w * h),
        volume: l * w * h,
        explanation: `A cuboid has 6 rectangular faces, 12 edges, and 8 vertices — like a cube, but its length, width, and height don't have to match.`,
      };
    }
    case "sphere": {
      const r = d.radius ?? 1;
      return {
        name,
        faces: 1,
        edges: 0,
        vertices: 0,
        surfaceArea: 4 * Math.PI * r * r,
        volume: (4 / 3) * Math.PI * r * r * r,
        explanation: `A sphere is perfectly round — every point on its surface is the same distance (${r}) from the center. It has one curved face and no edges or vertices.`,
      };
    }
    case "cylinder": {
      const r = d.radius ?? 1;
      const h = d.height ?? 1;
      return {
        name,
        faces: 3,
        edges: 2,
        vertices: 0,
        surfaceArea: 2 * Math.PI * r * (r + h),
        volume: Math.PI * r * r * h,
        explanation: `A cylinder has two flat circular faces (top and bottom) joined by one curved face. It has 2 curved edges and no vertices.`,
      };
    }
    case "cone": {
      const r = d.radius ?? 1;
      const h = d.height ?? 1;
      const slant = Math.sqrt(r * r + h * h);
      return {
        name,
        faces: 2,
        edges: 1,
        vertices: 1,
        surfaceArea: Math.PI * r * (r + slant),
        volume: (1 / 3) * Math.PI * r * r * h,
        explanation: `A cone has one flat circular base and one curved face that comes to a point (the apex). It has 1 edge (the base circle) and 1 vertex (the tip).`,
      };
    }
    case "triangular-prism": {
      const a = d.side ?? 1;
      const h = d.height ?? 1;
      const baseArea = (Math.sqrt(3) / 4) * a * a;
      return {
        name,
        faces: 5,
        edges: 9,
        vertices: 6,
        surfaceArea: 2 * baseArea + 3 * a * h,
        volume: baseArea * h,
        explanation: `A triangular prism has 2 triangular faces and 3 rectangular faces, 9 edges, and 6 vertices — it's the same triangle repeated all the way along its length.`,
      };
    }
    case "square-pyramid": {
      const a = d.side ?? 1;
      const h = d.height ?? 1;
      const slant = Math.sqrt(h * h + (a / 2) ** 2);
      return {
        name,
        faces: 5,
        edges: 8,
        vertices: 5,
        surfaceArea: a * a + 2 * a * slant,
        volume: (1 / 3) * a * a * h,
        explanation: `A square pyramid has 1 square base and 4 triangular faces that meet at the top (the apex), 8 edges, and 5 vertices.`,
      };
    }
    case "tetrahedron": {
      const a = d.side ?? 1;
      return {
        name,
        faces: 4,
        edges: 6,
        vertices: 4,
        surfaceArea: Math.sqrt(3) * a * a,
        volume: a ** 3 / (6 * Math.SQRT2),
        explanation: `A tetrahedron is made of 4 identical triangular faces, 6 edges, and 4 vertices — it's the simplest possible 3D shape with flat faces.`,
      };
    }
    case "pentagonal-prism": {
      const a = d.side ?? 1;
      const h = d.height ?? 1;
      const baseArea = regularPolygonArea(5, a);
      return {
        name,
        faces: 7,
        edges: 15,
        vertices: 10,
        surfaceArea: 2 * baseArea + 5 * a * h,
        volume: baseArea * h,
        explanation: `A pentagonal prism has 2 pentagon faces and 5 rectangular faces, 15 edges, and 10 vertices.`,
      };
    }
    case "hexagonal-prism": {
      const a = d.side ?? 1;
      const h = d.height ?? 1;
      const baseArea = regularPolygonArea(6, a);
      return {
        name,
        faces: 8,
        edges: 18,
        vertices: 12,
        surfaceArea: 2 * baseArea + 6 * a * h,
        volume: baseArea * h,
        explanation: `A hexagonal prism has 2 hexagon faces and 6 rectangular faces, 18 edges, and 12 vertices.`,
      };
    }
    case "hemisphere": {
      const r = d.radius ?? 1;
      return {
        name,
        faces: 2,
        edges: 1,
        vertices: 0,
        surfaceArea: 3 * Math.PI * r * r,
        volume: (2 / 3) * Math.PI * r * r * r,
        explanation: `A hemisphere is half a sphere — it has one curved face, one flat circular face, and one edge where they meet.`,
      };
    }
    case "torus": {
      const R = d.radius ?? 1;
      const r = d.tubeRadius ?? 0.3;
      return {
        name,
        faces: 1,
        edges: 0,
        vertices: 0,
        surfaceArea: 4 * Math.PI * Math.PI * R * r,
        volume: 2 * Math.PI * Math.PI * R * r * r,
        explanation: `A torus is a ring or donut shape — one continuous curved face with a hole through the middle, no edges or vertices.`,
      };
    }
  }
}

// ---------- Unit-cube activity ----------

export interface CuboidArrangement {
  x: number;
  y: number;
  z: number;
  used: number;
  leftover: number;
  isPerfectCube: boolean;
}

/**
 * Finds a "nice" cuboid arrangement (x*y*z) using as many of the n unit cubes as
 * possible, preferring the arrangement closest to a cube (minimizing the spread
 * between the three side lengths) among all factorizations that use every cube.
 * If n has no factorization using 3 factors all >1 in a reasonable range (e.g. n
 * is prime), it falls back to the largest perfect-cuboid it can build and reports
 * leftover cubes.
 */
export function bestCuboidArrangement(n: number): CuboidArrangement {
  if (n <= 0) return { x: 0, y: 0, z: 0, used: 0, leftover: n, isPerfectCube: false };

  const cubeRoot = Math.round(Math.cbrt(n));
  if (cubeRoot * cubeRoot * cubeRoot === n) {
    return { x: cubeRoot, y: cubeRoot, z: cubeRoot, used: n, leftover: 0, isPerfectCube: true };
  }

  // search downward from n for the largest m <= n with a "nice" 3-factor split
  for (let m = n; m >= 1; m--) {
    let best: { x: number; y: number; z: number; spread: number } | null = null;
    for (let x = 1; x <= Math.cbrt(m) + 1; x++) {
      if (m % x !== 0) continue;
      const rest = m / x;
      for (let y = x; y * y <= rest; y++) {
        if (rest % y !== 0) continue;
        const z = rest / y;
        if (z < y) continue;
        const spread = z - x;
        if (!best || spread < best.spread) best = { x, y, z, spread };
      }
    }
    if (best) {
      const cr = Math.round(Math.cbrt(m));
      const isPerfectCube = cr * cr * cr === m;
      return { x: best.x, y: best.y, z: best.z, used: m, leftover: n - m, isPerfectCube };
    }
  }
  return { x: 1, y: 1, z: n, used: n, leftover: 0, isPerfectCube: false };
}

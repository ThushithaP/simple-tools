import * as THREE from "three";
import { ShapeDimensions, ShapeKind } from "./types";

export interface FaceGroup {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  area: number;
}

function triArea(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  return new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() / 2;
}

function triangleFace(id: string, name: string, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): FaceGroup {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z]);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return { id, name, geometry, area: triArea(p1, p2, p3) };
}

function quadFace(id: string, name: string, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3): FaceGroup {
  const geometry = new THREE.BufferGeometry();
  // two triangles: p1,p2,p3 and p1,p3,p4
  const positions = new Float32Array([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z]);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return { id, name, geometry, area: triArea(p1, p2, p3) + triArea(p1, p3, p4) };
}

function planeFaceGroup(id: string, name: string, sizeU: number, sizeV: number, position: THREE.Vector3, rotation: THREE.Euler): FaceGroup {
  const geometry = new THREE.PlaneGeometry(sizeU, sizeV);
  geometry.rotateX(rotation.x);
  geometry.rotateY(rotation.y);
  geometry.rotateZ(rotation.z);
  geometry.translate(position.x, position.y, position.z);
  return { id, name, geometry, area: sizeU * sizeV };
}

/** Regular n-gon vertices in the XZ plane at a given y, side length `side`. */
function polygonVertices(n: number, side: number, y: number): THREE.Vector3[] {
  const R = side / (2 * Math.sin(Math.PI / n));
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const theta = -Math.PI / 2 + (k * 2 * Math.PI) / n;
    pts.push(new THREE.Vector3(R * Math.cos(theta), y, R * Math.sin(theta)));
  }
  return pts;
}

function polygonCap(id: string, name: string, verts: THREE.Vector3[], flipWinding: boolean): FaceGroup {
  const geometry = new THREE.BufferGeometry();
  const n = verts.length;
  const positions: number[] = [];
  const center = new THREE.Vector3();
  verts.forEach((v) => center.add(v));
  center.divideScalar(n);
  let area = 0;
  for (let k = 0; k < n; k++) {
    const a = center;
    const b = verts[k];
    const c = verts[(k + 1) % n];
    const [p1, p2, p3] = flipWinding ? [a, c, b] : [a, b, c];
    positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    area += triArea(a, b, c);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  return { id, name, geometry, area };
}

/** Generalized prism: n-sided regular polygon base, used for triangular/pentagonal/hexagonal prisms. */
function prismFaces(nSides: number, side: number, height: number, capName: string): FaceGroup[] {
  const top = polygonVertices(nSides, side, height / 2);
  const bottom = polygonVertices(nSides, side, -height / 2);
  const groups: FaceGroup[] = [
    polygonCap("cap-top", `Top ${capName}`, top, false),
    polygonCap("cap-bottom", `Bottom ${capName}`, bottom, true),
  ];
  for (let k = 0; k < nSides; k++) {
    const a = bottom[k];
    const b = bottom[(k + 1) % nSides];
    const c = top[(k + 1) % nSides];
    const d = top[k];
    groups.push(quadFace(`side-${k}`, `Side ${k + 1}`, a, b, c, d));
  }
  return groups;
}

export function buildFaceGroups(kind: ShapeKind, d: ShapeDimensions): FaceGroup[] {
  switch (kind) {
    case "cube":
    case "cuboid": {
      const l = kind === "cube" ? d.side ?? 1 : d.length ?? 1;
      const w = kind === "cube" ? d.side ?? 1 : d.width ?? 1;
      const h = kind === "cube" ? d.side ?? 1 : d.height ?? 1;
      const hx = l / 2,
        hy = h / 2,
        hz = w / 2;
      return [
        planeFaceGroup("top", "Top face", l, w, new THREE.Vector3(0, hy, 0), new THREE.Euler(-Math.PI / 2, 0, 0)),
        planeFaceGroup("bottom", "Bottom face", l, w, new THREE.Vector3(0, -hy, 0), new THREE.Euler(Math.PI / 2, 0, 0)),
        planeFaceGroup("front", "Front face", l, h, new THREE.Vector3(0, 0, hz), new THREE.Euler(0, 0, 0)),
        planeFaceGroup("back", "Back face", l, h, new THREE.Vector3(0, 0, -hz), new THREE.Euler(0, Math.PI, 0)),
        planeFaceGroup("right", "Right face", w, h, new THREE.Vector3(hx, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)),
        planeFaceGroup("left", "Left face", w, h, new THREE.Vector3(-hx, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0)),
      ];
    }
    case "sphere": {
      const r = d.radius ?? 1;
      const geometry = new THREE.SphereGeometry(r, 48, 32);
      return [{ id: "surface", name: "Curved surface", geometry, area: 4 * Math.PI * r * r }];
    }
    case "hemisphere": {
      const r = d.radius ?? 1;
      const dome = new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      const base = new THREE.CircleGeometry(r, 48);
      base.rotateX(Math.PI / 2);
      return [
        { id: "dome", name: "Curved face", geometry: dome, area: 2 * Math.PI * r * r },
        { id: "base", name: "Flat base", geometry: base, area: Math.PI * r * r },
      ];
    }
    case "cylinder": {
      const r = d.radius ?? 1;
      const h = d.height ?? 1;
      const top = new THREE.CircleGeometry(r, 48);
      top.rotateX(-Math.PI / 2);
      top.translate(0, h / 2, 0);
      const bottom = new THREE.CircleGeometry(r, 48);
      bottom.rotateX(Math.PI / 2);
      bottom.translate(0, -h / 2, 0);
      const side = new THREE.CylinderGeometry(r, r, h, 48, 1, true);
      return [
        { id: "top", name: "Top face", geometry: top, area: Math.PI * r * r },
        { id: "bottom", name: "Bottom face", geometry: bottom, area: Math.PI * r * r },
        { id: "side", name: "Curved side", geometry: side, area: 2 * Math.PI * r * h },
      ];
    }
    case "cone": {
      const r = d.radius ?? 1;
      const h = d.height ?? 1;
      const slant = Math.sqrt(r * r + h * h);
      const bottom = new THREE.CircleGeometry(r, 48);
      bottom.rotateX(Math.PI / 2);
      bottom.translate(0, -h / 2, 0);
      const side = new THREE.ConeGeometry(r, h, 48, 1, true);
      return [
        { id: "base", name: "Base face", geometry: bottom, area: Math.PI * r * r },
        { id: "side", name: "Curved side", geometry: side, area: Math.PI * r * slant },
      ];
    }
    case "torus": {
      const R = d.radius ?? 1;
      const r = d.tubeRadius ?? 0.3;
      const geometry = new THREE.TorusGeometry(R, r, 24, 48);
      return [{ id: "surface", name: "Curved surface", geometry, area: 4 * Math.PI * Math.PI * R * r }];
    }
    case "tetrahedron": {
      const a = d.side ?? 1;
      const s = a / (2 * Math.SQRT2);
      const v0 = new THREE.Vector3(1, 1, 1).multiplyScalar(s);
      const v1 = new THREE.Vector3(1, -1, -1).multiplyScalar(s);
      const v2 = new THREE.Vector3(-1, 1, -1).multiplyScalar(s);
      const v3 = new THREE.Vector3(-1, -1, 1).multiplyScalar(s);
      return [
        triangleFace("f0", "Face 1", v0, v1, v2),
        triangleFace("f1", "Face 2", v0, v3, v1),
        triangleFace("f2", "Face 3", v0, v2, v3),
        triangleFace("f3", "Face 4", v1, v3, v2),
      ];
    }
    case "square-pyramid": {
      const a = d.side ?? 1;
      const h = d.height ?? 1;
      const half = a / 2;
      const apex = new THREE.Vector3(0, h / 2, 0);
      const c0 = new THREE.Vector3(-half, -h / 2, half);
      const c1 = new THREE.Vector3(half, -h / 2, half);
      const c2 = new THREE.Vector3(half, -h / 2, -half);
      const c3 = new THREE.Vector3(-half, -h / 2, -half);
      return [
        quadFace("base", "Base face", c3, c2, c1, c0),
        triangleFace("s0", "Side 1", apex, c0, c1),
        triangleFace("s1", "Side 2", apex, c1, c2),
        triangleFace("s2", "Side 3", apex, c2, c3),
        triangleFace("s3", "Side 4", apex, c3, c0),
      ];
    }
    case "triangular-prism":
      return prismFaces(3, d.side ?? 1, d.height ?? 1, "triangle");
    case "pentagonal-prism":
      return prismFaces(5, d.side ?? 1, d.height ?? 1, "pentagon");
    case "hexagonal-prism":
      return prismFaces(6, d.side ?? 1, d.height ?? 1, "hexagon");
  }
}

export type ShapeKind =
  | "cube"
  | "cuboid"
  | "sphere"
  | "cylinder"
  | "cone"
  | "triangular-prism"
  | "square-pyramid"
  | "tetrahedron"
  | "pentagonal-prism"
  | "hexagonal-prism"
  | "hemisphere"
  | "torus";

export type RenderMode = "solid" | "wireframe" | "transparent";
export type LengthUnit = "mm" | "cm" | "m";

export interface ShapeDimensions {
  // meaning depends on shape kind; unused fields are ignored
  length?: number;
  width?: number;
  height?: number;
  radius?: number;
  tubeRadius?: number;
  side?: number;
}

export interface ShapeInfo {
  name: string;
  faces: number;
  edges: number;
  vertices: number;
  surfaceArea: number;
  volume: number;
  explanation: string;
}

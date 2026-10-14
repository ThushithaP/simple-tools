export type OpticsMode = "plane-mirror" | "curved-mirror" | "refraction" | "converging-lens" | "diverging-lens";

export type MirrorType = "concave" | "convex";
export type OpticalMedium = "air" | "water" | "glass" | "diamond";

export interface Vec2 {
  x: number;
  y: number;
}

export interface RayPath {
  label: string;
  /** the real, physical incident segment: object -> hit point on the element */
  incidentFrom: Vec2;
  incidentTo: Vec2;
  /** the real, physical outgoing segment after reflection/refraction */
  outgoingFrom: Vec2;
  outgoingTo: Vec2;
  /** dashed backward-construction segment shown only when the image is virtual */
  virtualExtension?: { from: Vec2; to: Vec2 };
}

export interface ImageResult {
  imageDistance: number; // di, signed per sign convention
  imageHeight: number; // hi, signed
  magnification: number; // M
  isReal: boolean;
  isUpright: boolean;
  sizeLabel: "Magnified" | "Diminished" | "Same size";
  atInfinity: boolean;
}

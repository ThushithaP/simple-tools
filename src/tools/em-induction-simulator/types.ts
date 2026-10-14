export type MagnetPole = "N" | "S";
export type MotionType = "linear" | "rotational";
export type GeneratorMotorMode = "generator" | "motor";
export type CoreMaterial = "air" | "iron" | "ferrite";
export type LoadKind = "resistive" | "inductive" | "capacitive";
export type TransformerFidelity = "ideal" | "real";

export interface DataPoint {
  x: number;
  y: number;
}

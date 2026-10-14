export type SemiMode = "basics" | "junction" | "diode-iv" | "rectification" | "transistor";

export type Material = "silicon" | "germanium";
export type DopingType = "none" | "n-type" | "p-type";
export type RectifierCircuit = "half-wave" | "full-wave" | "full-wave-capacitor";
export type DiodeModel = "silicon" | "germanium" | "ideal";
export type TransistorType = "npn" | "pnp";
export type TransistorConfig = "switch" | "amplifier";

export interface DataPoint {
  x: number;
  y: number;
}

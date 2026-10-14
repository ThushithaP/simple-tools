export type SimMode = "string" | "sound" | "interference" | "standing";

export type BoundaryType = "fixed" | "loose" | "open";
export type TensionLevel = "low" | "medium" | "high";
export type DampingLevel = "none" | "low" | "medium" | "high";
export type SoundMedium = "air" | "water" | "steel";
export type StandingWaveGeometry = "string" | "pipe-open-open" | "pipe-open-closed";

export interface DataPoint {
  t: number;
  value: number;
}

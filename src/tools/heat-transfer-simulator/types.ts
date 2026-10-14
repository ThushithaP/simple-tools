export type ConductionMaterial = "copper" | "aluminum" | "iron" | "glass" | "wood" | "styrofoam";
export type SpecificHeatMaterial = "water" | "aluminum" | "copper" | "iron" | "air";
export type PhaseChangeSubstance = "water" | "ethanol" | "aluminum" | "lead" | "nitrogen";
export type Phase = "solid" | "melting" | "liquid" | "boiling" | "gas";
export type ConvectionFluid = "air" | "water" | "oil";
export type ConvectionType = "natural" | "forced";
export type SurfaceFinish = "black" | "white" | "shiny-metal" | "red" | "blue";

export interface DataPoint {
  x: number;
  y: number;
}

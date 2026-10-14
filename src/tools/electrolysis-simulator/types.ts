export type ElectrodeMaterial = "Graphite" | "Copper" | "Platinum" | "Iron";

export type Electrolyte = "CuSO4" | "NaCl" | "H2SO4-water";

export interface ReactionResult {
  cathodeEquation: string;
  anodeEquation: string;
  cathodeLabel: string;
  anodeLabel: string;
  copperDeposits: boolean;
  anodeDissolves: boolean;
  cathodeBubbles: boolean;
  anodeBubbles: boolean;
  cathodeBubbleColor: string;
  anodeBubbleColor: string;
  /** electrons transferred per Cu atom deposited at the cathode (always 2, kept for clarity) */
  cathodeElectronsPerUnit: number;
  /** electrons transferred per gas molecule released at the anode (O2: 4, Cl2: 2) */
  anodeElectronsPerUnit: number | null;
  anodeGasLabel: "O2" | "Cl2" | "H2" | null;
  note?: string;
}

export interface IonParticle {
  id: number;
  kind: "Cu2+" | "SO4-2" | "Na+" | "Cl-" | "H+" | "OH-";
  x: number;
  y: number;
  targetX: number;
}

export interface Bubble {
  id: number;
  x: number;
  y: number;
  r: number;
  opacity: number;
  color: string;
}

import { Electrolyte } from "../types";

export interface IonSpeciesDef {
  color: string;
  symbol: string;
  name: string;
  /** true = migrates toward the cathode (cation), false = migrates toward the anode (anion) */
  toCathode: boolean;
  count: number;
  /** minor/spectator ions are shown smaller in the legend, still listed for completeness */
  minor?: boolean;
}

export function ionSpecies(electrolyte: Electrolyte): IonSpeciesDef[] {
  switch (electrolyte) {
    case "CuSO4":
      return [
        { color: "#4A90E2", symbol: "Cu²⁺", name: "Copper(II) ion", toCathode: true, count: 10 },
        { color: "#F5A623", symbol: "SO₄²⁻", name: "Sulfate ion", toCathode: false, count: 10 },
      ];
    case "NaCl":
      return [
        { color: "#B98BD9", symbol: "Na⁺", name: "Sodium ion (spectator)", toCathode: true, count: 7 },
        { color: "#DCE87A", symbol: "Cl⁻", name: "Chloride ion", toCathode: false, count: 7 },
        { color: "#E8584A", symbol: "H⁺", name: "Hydrogen ion", toCathode: true, count: 4, minor: true },
        { color: "#6FCF7A", symbol: "OH⁻", name: "Hydroxide ion", toCathode: false, count: 4, minor: true },
      ];
    case "H2SO4-water":
      return [
        { color: "#E8584A", symbol: "H⁺", name: "Hydrogen ion", toCathode: true, count: 10 },
        { color: "#6FCF7A", symbol: "OH⁻", name: "Hydroxide ion", toCathode: false, count: 10 },
      ];
    case "molten-CuSO4":
    default:
      return [
        { color: "#4A90E2", symbol: "Cu²⁺", name: "Copper(II) ion", toCathode: true, count: 10 },
        { color: "#F5A623", symbol: "SO₄²⁻", name: "Sulfate ion", toCathode: false, count: 10 },
      ];
  }
}

import { Electrolyte, ElectrodeMaterial, ReactionResult } from "./types";

export const FARADAY_CONSTANT = 96500; // C/mol
export const MOLAR_MASS_CU = 63.5; // g/mol
export const MOLAR_VOLUME_CM3 = 24000; // cm3/mol, approx. room temperature & pressure

/**
 * Simplified teaching model for current draw — NOT a real conductivity model.
 * Current rises with voltage and with ion concentration (more charge carriers).
 */
export function estimateCurrentAmps(voltageV: number, concentrationM: number): number {
  const k = 0.4;
  return Math.max(0.05, voltageV * concentrationM * k);
}

export function copperMassDepositedGrams(currentA: number, timeS: number): number {
  return (MOLAR_MASS_CU * currentA * timeS) / (2 * FARADAY_CONSTANT);
}

export function gasVolumeCm3(currentA: number, timeS: number, electronsPerUnit: number): number {
  const molesElectrons = (currentA * timeS) / FARADAY_CONSTANT;
  const molesGas = molesElectrons / electronsPerUnit;
  return molesGas * MOLAR_VOLUME_CM3;
}

/**
 * Determines the half-equations and visual behaviour for a given electrolyte
 * and pair of electrode materials, per standard O-Level electrolysis rules:
 * - Reactive (active) electrodes, e.g. copper, dissolve at the anode instead
 *   of the electrolyte being oxidised.
 * - In aqueous solution, Cu2+ discharges preferentially over H+ at the cathode,
 *   and H+ discharges preferentially over Na+.
 * - At the anode, halide ions (e.g. Cl-) discharge preferentially over OH-/water
 *   when the solution is concentrated; dilute halide solutions release O2 instead.
 */
export function determineReactions(
  electrolyte: Electrolyte,
  anodeMaterial: ElectrodeMaterial,
  cathodeMaterial: ElectrodeMaterial,
  concentrationM: number
): ReactionResult {
  const anodeIsActive = anodeMaterial === "Copper";

  if (electrolyte === "CuSO4") {
    if (anodeIsActive) {
      return {
        cathodeEquation: "Cu2+(aq) + 2e- -> Cu(s)",
        anodeEquation: "Cu(s) -> Cu2+(aq) + 2e-",
        cathodeLabel: "Copper deposits",
        anodeLabel: "Anode dissolves",
        copperDeposits: true,
        anodeDissolves: true,
        cathodeBubbles: false,
        anodeBubbles: false,
        cathodeBubbleColor: "",
        anodeBubbleColor: "",
        cathodeElectronsPerUnit: 2,
        anodeElectronsPerUnit: null,
        anodeGasLabel: null,
      };
    }
    return {
      cathodeEquation: "Cu2+(aq) + 2e- -> Cu(s)",
      anodeEquation: "2H2O(l) -> O2(g) + 4H+(aq) + 4e-",
      cathodeLabel: "Copper deposits",
      anodeLabel: "Oxygen bubbles",
      copperDeposits: true,
      anodeDissolves: false,
      cathodeBubbles: false,
      anodeBubbles: true,
      cathodeBubbleColor: "",
      anodeBubbleColor: "#EEF2F1",
      cathodeElectronsPerUnit: 2,
      anodeElectronsPerUnit: 4,
      anodeGasLabel: "O2",
    };
  }

  if (electrolyte === "NaCl") {
    const concentrated = concentrationM >= 1.0;
    if (anodeIsActive) {
      return {
        cathodeEquation: "2H+(aq) + 2e- -> H2(g)",
        anodeEquation: "Cu(s) -> Cu2+(aq) + 2e-",
        cathodeLabel: "Hydrogen bubbles",
        anodeLabel: "Anode dissolves",
        copperDeposits: false,
        anodeDissolves: true,
        cathodeBubbles: true,
        anodeBubbles: false,
        cathodeBubbleColor: "#EEF2F1",
        anodeBubbleColor: "",
        cathodeElectronsPerUnit: 2,
        anodeElectronsPerUnit: null,
        anodeGasLabel: null,
        note: "A copper anode dissolves preferentially even in NaCl solution — active electrodes always dissolve.",
      };
    }
    if (concentrated) {
      return {
        cathodeEquation: "2H+(aq) + 2e- -> H2(g)",
        anodeEquation: "2Cl-(aq) -> Cl2(g) + 2e-",
        cathodeLabel: "Hydrogen bubbles",
        anodeLabel: "Chlorine gas",
        copperDeposits: false,
        anodeDissolves: false,
        cathodeBubbles: true,
        anodeBubbles: true,
        cathodeBubbleColor: "#EEF2F1",
        anodeBubbleColor: "#DCE87A",
        cathodeElectronsPerUnit: 2,
        anodeElectronsPerUnit: 2,
        anodeGasLabel: "Cl2",
      };
    }
    return {
      cathodeEquation: "2H+(aq) + 2e- -> H2(g)",
      anodeEquation: "4OH-(aq) -> O2(g) + 2H2O(l) + 4e-",
      cathodeLabel: "Hydrogen bubbles",
      anodeLabel: "Oxygen bubbles",
      copperDeposits: false,
      anodeDissolves: false,
      cathodeBubbles: true,
      anodeBubbles: true,
      cathodeBubbleColor: "#EEF2F1",
      anodeBubbleColor: "#EEF2F1",
      cathodeElectronsPerUnit: 2,
      anodeElectronsPerUnit: 4,
      anodeGasLabel: "O2",
      note: "Dilute NaCl(aq): OH- discharges instead of Cl-. Raise concentration to 1.0 M or above for chlorine gas.",
    };
  }

  if (electrolyte === "H2SO4-water") {
    if (anodeIsActive) {
      return {
        cathodeEquation: "2H+(aq) + 2e- -> H2(g)",
        anodeEquation: "Cu(s) -> Cu2+(aq) + 2e-",
        cathodeLabel: "Hydrogen bubbles",
        anodeLabel: "Anode dissolves",
        copperDeposits: false,
        anodeDissolves: true,
        cathodeBubbles: true,
        anodeBubbles: false,
        cathodeBubbleColor: "#EEF2F1",
        anodeBubbleColor: "",
        cathodeElectronsPerUnit: 2,
        anodeElectronsPerUnit: null,
        anodeGasLabel: null,
        note: "A copper anode dissolves rather than oxidising water.",
      };
    }
    return {
      cathodeEquation: "2H+(aq) + 2e- -> H2(g)",
      anodeEquation: "4OH-(aq) -> O2(g) + 2H2O(l) + 4e-",
      cathodeLabel: "Hydrogen bubbles",
      anodeLabel: "Oxygen bubbles",
      copperDeposits: false,
      anodeDissolves: false,
      cathodeBubbles: true,
      anodeBubbles: true,
      cathodeBubbleColor: "#EEF2F1",
      anodeBubbleColor: "#EEF2F1",
      cathodeElectronsPerUnit: 2,
      anodeElectronsPerUnit: 4,
      anodeGasLabel: "O2",
      note: "This is electrolysis of water: overall 2H2O -> 2H2 + O2, with H2SO4 present only to make it conduct.",
    };
  }

  // molten-CuSO4 — a simplified, no-water scenario for teaching metal extraction/refining.
  if (anodeIsActive) {
    return {
      cathodeEquation: "Cu2+(l) + 2e- -> Cu(s)",
      anodeEquation: "Cu(s) -> Cu2+(l) + 2e-",
      cathodeLabel: "Copper deposits",
      anodeLabel: "Anode dissolves",
      copperDeposits: true,
      anodeDissolves: true,
      cathodeBubbles: false,
      anodeBubbles: false,
      cathodeBubbleColor: "",
      anodeBubbleColor: "",
      cathodeElectronsPerUnit: 2,
      anodeElectronsPerUnit: null,
      anodeGasLabel: null,
      note: "This mirrors electrolytic refining: an active copper anode dissolves and pure copper redeposits at the cathode.",
    };
  }
  return {
    cathodeEquation: "Cu2+(l) + 2e- -> Cu(s)",
    anodeEquation: "2SO4^2-(l) -> (complex oxidation, simplified here to O2(g) + SO3 byproducts)",
    cathodeLabel: "Copper deposits",
    anodeLabel: "Gas evolves (simplified)",
    copperDeposits: true,
    anodeDissolves: false,
    cathodeBubbles: false,
    anodeBubbles: true,
    cathodeBubbleColor: "",
    anodeBubbleColor: "#EEF2F1",
    cathodeElectronsPerUnit: 2,
    anodeElectronsPerUnit: 4,
    anodeGasLabel: "O2",
    note: "Molten sulfate electrolysis is not standard O-Level chemistry — the anode reaction here is a simplification, not exact.",
  };
}

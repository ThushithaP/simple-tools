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

export function determineReactions(
  electrolyte: Electrolyte,
  anodeMaterial: ElectrodeMaterial,
  cathodeMaterial: ElectrodeMaterial,
  concentrationM: number
): ReactionResult {

  // ============================================================
  // CuSO4(aq)
  // ============================================================

  if (electrolyte === "CuSO4") {

    /**
     * Copper anode + CuSO4:
     *
     * Cu(s) → Cu²⁺(aq) + 2e⁻
     *
     * Copper dissolves from the anode.
     *
     * At the cathode:
     *
     * Cu²⁺(aq) + 2e⁻ → Cu(s)
     *
     * Copper deposits on the cathode.
     *
     * This is the standard copper electroplating/refining model.
     */
    if (anodeMaterial === "Copper") {
      return {
        cathodeEquation:
          "Cu²⁺(aq) + 2e⁻ → Cu(s)",

        anodeEquation:
          "Cu(s) → Cu²⁺(aq) + 2e⁻",

        cathodeLabel:
          "Copper deposits",

        anodeLabel:
          "Copper dissolves",

        copperDeposits: true,
        anodeDissolves: true,

        cathodeBubbles: false,
        anodeBubbles: false,

        cathodeBubbleColor: "",
        anodeBubbleColor: "",

        cathodeElectronsPerUnit: 2,
        anodeElectronsPerUnit: null,

        anodeGasLabel: null,

        note:
          "Copper is transferred from the copper anode to the cathode. An iron cathode can be copper-plated."
      };
    }

    /**
     * Graphite / Platinum / Iron anode:
     *
     * For this simplified educational model, the electrode
     * is treated as inert with respect to CuSO4 and water
     * is oxidised at the anode.
     *
     * Cathode:
     * Cu²⁺ + 2e⁻ → Cu
     *
     * Anode:
     * 2H₂O → O₂ + 4H⁺ + 4e⁻
     */
    return {
      cathodeEquation:
        "Cu²⁺(aq) + 2e⁻ → Cu(s)",

      anodeEquation:
        "2H₂O(l) → O₂(g) + 4H⁺(aq) + 4e⁻",

      cathodeLabel:
        "Copper deposits",

      anodeLabel:
        "Oxygen bubbles",

      copperDeposits: true,
      anodeDissolves: false,

      cathodeBubbles: false,
      anodeBubbles: true,

      cathodeBubbleColor: "",
      anodeBubbleColor: "#EEF2F1",

      cathodeElectronsPerUnit: 2,
      anodeElectronsPerUnit: 4,

      anodeGasLabel: "O2",

      note:
        "With a non-copper anode, Cu²⁺ is reduced and copper deposits at the cathode. Water is oxidised at the anode."
    };
  }

  // ============================================================
  // NaCl(aq)
  // ============================================================

  if (electrolyte === "NaCl") {

    /**
     * Simplified teaching rule:
     *
     * concentration >= 1.0 M
     *     → concentrated NaCl
     *     → chlorine at the anode
     *
     * concentration < 1.0 M
     *     → dilute NaCl
     *     → oxygen at the anode
     *
     * This is a teaching approximation rather than a universal
     * chemical boundary.
     */

    const concentrated = concentrationM >= 1.0;

    /**
     * In aqueous NaCl, water is reduced at the cathode:
     *
     * 2H₂O + 2e⁻ → H₂ + 2OH⁻
     *
     * Therefore hydrogen is produced regardless of whether
     * the NaCl solution is dilute or concentrated.
     */

    if (concentrated) {
      return {
        cathodeEquation:
          "2H₂O(l) + 2e⁻ → H₂(g) + 2OH⁻(aq)",

        anodeEquation:
          "2Cl⁻(aq) → Cl₂(g) + 2e⁻",

        cathodeLabel:
          "Hydrogen bubbles",

        anodeLabel:
          "Chlorine gas",

        copperDeposits: false,
        anodeDissolves: false,

        cathodeBubbles: true,
        anodeBubbles: true,

        cathodeBubbleColor: "#EEF2F1",
        anodeBubbleColor: "#DCE87A",

        cathodeElectronsPerUnit: 2,
        anodeElectronsPerUnit: 2,

        anodeGasLabel: "Cl2",

        note:
          "Simplified school-level model: concentrated aqueous NaCl produces hydrogen at the cathode and chlorine at the anode."
      };
    }

    /**
     * Dilute NaCl:
     *
     * Cathode:
     * 2H₂O + 2e⁻ → H₂ + 2OH⁻
     *
     * Anode:
     * 4OH⁻ → O₂ + 2H₂O + 4e⁻
     */
    return {
      cathodeEquation:
        "2H₂O(l) + 2e⁻ → H₂(g) + 2OH⁻(aq)",

      anodeEquation:
        "4OH⁻(aq) → O₂(g) + 2H₂O(l) + 4e⁻",

      cathodeLabel:
        "Hydrogen bubbles",

      anodeLabel:
        "Oxygen bubbles",

      copperDeposits: false,
      anodeDissolves: false,

      cathodeBubbles: true,
      anodeBubbles: true,

      cathodeBubbleColor: "#EEF2F1",
      anodeBubbleColor: "#EEF2F1",

      cathodeElectronsPerUnit: 2,
      anodeElectronsPerUnit: 4,

      anodeGasLabel: "O2",

      note:
        "Simplified school-level model: dilute aqueous NaCl is treated as producing oxygen at the anode."
    };
  }

  // ============================================================
  // H2SO4(aq) / acidified water
  // ============================================================

  if (electrolyte === "H2SO4-water") {

    /**
     * Copper anode:
     *
     * Cu → Cu²⁺ + 2e⁻
     *
     * Hydrogen is produced at the cathode.
     */
    if (anodeMaterial === "Copper") {
      return {
        cathodeEquation:
          "2H⁺(aq) + 2e⁻ → H₂(g)",

        anodeEquation:
          "Cu(s) → Cu²⁺(aq) + 2e⁻",

        cathodeLabel:
          "Hydrogen bubbles",

        anodeLabel:
          "Copper dissolves",

        copperDeposits: false,
        anodeDissolves: true,

        cathodeBubbles: true,
        anodeBubbles: false,

        cathodeBubbleColor: "#EEF2F1",
        anodeBubbleColor: "",

        cathodeElectronsPerUnit: 2,
        anodeElectronsPerUnit: null,

        anodeGasLabel: null,

        note:
          "With a copper anode, copper is oxidised at the anode while hydrogen is produced at the cathode."
      };
    }

    /**
     * Graphite / Platinum / Iron:
     *
     * Cathode:
     * 2H⁺ + 2e⁻ → H₂
     *
     * Anode:
     * 2H₂O → O₂ + 4H⁺ + 4e⁻
     *
     * This represents electrolysis of acidified water.
     */
    return {
      cathodeEquation:
        "2H⁺(aq) + 2e⁻ → H₂(g)",

      anodeEquation:
        "2H₂O(l) → O₂(g) + 4H⁺(aq) + 4e⁻",

      cathodeLabel:
        "Hydrogen bubbles",

      anodeLabel:
        "Oxygen bubbles",

      copperDeposits: false,
      anodeDissolves: false,

      cathodeBubbles: true,
      anodeBubbles: true,

      cathodeBubbleColor: "#EEF2F1",
      anodeBubbleColor: "#EEF2F1",

      cathodeElectronsPerUnit: 2,
      anodeElectronsPerUnit: 4,

      anodeGasLabel: "O2",

      note:
        "Acidified water produces hydrogen at the cathode and oxygen at the anode. H₂SO₄ mainly provides ions to increase conductivity."
    };
  }

  // This should be unreachable if the Electrolyte union
  // contains only the supported values.
  throw new Error(
    `Unsupported electrolyte: ${electrolyte}`
  );
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
export function determineReactionsss(
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

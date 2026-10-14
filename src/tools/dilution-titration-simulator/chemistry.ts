// Chemistry calculations for the Dilution + Titration simulator.
// All volumes are in mL, all concentrations in mol/L (M).

export type IndicatorId = "phenolphthalein" | "methylOrange" | "bromothymolBlue";

export interface IndicatorDef {
  id: IndicatorId;
  label: string;
  /** pH below this is fully "low" color */
  lowPh: number;
  /** pH above this is fully "high" color */
  highPh: number;
  colorLow: string;
  colorHigh: string;
}

export const INDICATORS: Record<IndicatorId, IndicatorDef> = {
  phenolphthalein: {
    id: "phenolphthalein",
    label: "Phenolphthalein",
    lowPh: 8.2,
    highPh: 10.0,
    colorLow: "#f5f1ea", // colorless (rendered as faint glass tint)
    colorHigh: "#e8829e", // pink
  },
  methylOrange: {
    id: "methylOrange",
    label: "Methyl Orange",
    lowPh: 3.1,
    highPh: 4.4,
    colorLow: "#d9422f", // red
    colorHigh: "#f2c14e", // yellow
  },
  bromothymolBlue: {
    id: "bromothymolBlue",
    label: "Bromothymol Blue",
    lowPh: 6.0,
    highPh: 7.6,
    colorLow: "#e8c84e", // yellow
    colorHigh: "#4e8fe8", // blue
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Interpolated indicator color for a given pH, smoothly transitioning across its range. */
export function indicatorColor(indicator: IndicatorDef, pH: number): string {
  const { lowPh, highPh, colorLow, colorHigh } = indicator;
  const t = Math.max(0, Math.min(1, (pH - lowPh) / (highPh - lowPh)));
  const [r1, g1, b1] = hexToRgb(colorLow);
  const [r2, g2, b2] = hexToRgb(colorHigh);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// ---- Dilution ----

/** C1V1 = C2V2 solved for the resulting concentration. */
export function dilutedConcentration(c1: number, v1: number, v2: number): number {
  if (v2 <= 0) return 0;
  return (c1 * v1) / v2;
}

export interface DilutionStep {
  id: string;
  c1: number;
  v1: number;
  v2: number;
}

export function resolveDilutionChain(startConcentration: number, steps: DilutionStep[]) {
  let current = startConcentration;
  return steps.map((step) => {
    const c1 = current;
    const c2 = dilutedConcentration(c1, step.v1, step.v2);
    current = c2;
    return { ...step, c1, c2 };
  });
}

// ---- Titration (strong acid / strong base) ----

export interface TitrationPoint {
  volumeMl: number;
  pH: number;
}

/** Millimoles of solute present in a given volume (mL) at a given concentration (M). */
export function millimoles(concentration: number, volumeMl: number): number {
  return concentration * volumeMl;
}

/** Theoretical equivalence volume of titrant (mL) for a strong acid vs strong base titration. */
export function equivalenceVolumeMl(analyteConc: number, analyteVolMl: number, titrantConc: number): number {
  if (titrantConc <= 0) return 0;
  return (analyteConc * analyteVolMl) / titrantConc;
}

const EPSILON_MMOL = 1e-9;

/**
 * pH of the flask during a strong-acid-analyte + strong-base-titrant titration
 * (or vice versa, controlled by `analyteIsAcid`), after `titrantVolMl` of titrant
 * has been added.
 */
export function calcTitrationPH(
  analyteConc: number,
  analyteVolMl: number,
  titrantConc: number,
  titrantVolMl: number,
  analyteIsAcid: boolean
): number {
  const molAnalyte = millimoles(analyteConc, analyteVolMl);
  const molTitrant = millimoles(titrantConc, titrantVolMl);
  const totalVol = analyteVolMl + titrantVolMl;
  if (totalVol <= 0) return analyteIsAcid ? 0 : 14;

  const diff = molAnalyte - molTitrant;

  if (Math.abs(diff) < EPSILON_MMOL || Math.abs(diff) < molAnalyte * 1e-6) {
    return 7;
  }

  if (diff > 0) {
    // Analyte in excess
    const excessConc = diff / totalVol;
    if (analyteIsAcid) {
      return clampPh(-Math.log10(excessConc));
    }
    const pOH = -Math.log10(excessConc);
    return clampPh(14 - pOH);
  } else {
    // Titrant in excess
    const excessConc = -diff / totalVol;
    if (analyteIsAcid) {
      const pOH = -Math.log10(excessConc);
      return clampPh(14 - pOH);
    }
    return clampPh(-Math.log10(excessConc));
  }
}

function clampPh(pH: number): number {
  if (Number.isNaN(pH)) return 7;
  return Math.max(0, Math.min(14, pH));
}

export function formatNumber(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return "—";
  const fixed = n.toFixed(digits);
  const trimmed = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

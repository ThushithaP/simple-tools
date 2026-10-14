import { DiodeModel, Material } from "./types";

// ---------- Fundamental constants ----------
export const BOLTZMANN_K = 1.380649e-23; // J/K
export const ELECTRON_CHARGE = 1.602176634e-19; // C
export const EPS0 = 8.8541878128e-12; // F/m

// ---------- Material properties (at 300 K reference) ----------
export const BAND_GAP_EV: Record<Material, number> = { silicon: 1.12, germanium: 0.67 };
export const INTRINSIC_CONC_CM3: Record<Material, number> = { silicon: 1.5e10, germanium: 2.4e13 };
export const RELATIVE_PERMITTIVITY: Record<Material, number> = { silicon: 11.7, germanium: 16.0 };
export const TYPICAL_VF: Record<Material, number> = { silicon: 0.7, germanium: 0.3 };
export const REFERENCE_IS_A: Record<Material, number> = { silicon: 1e-12, germanium: 1e-6 }; // at 300K, typical

/** Thermal voltage V_T = kT/q. */
export function thermalVoltage(tempK: number): number {
  return (BOLTZMANN_K * tempK) / ELECTRON_CHARGE;
}

// ---------- Mode 1: Semiconductor basics (mass action law) ----------

export interface CarrierConcentrations {
  electronConc: number; // cm^-3
  holeConc: number; // cm^-3
  intrinsicConc: number; // cm^-3
  majority: "electrons" | "holes" | "none";
  conductivityLabel: "Insulator-like" | "Semiconductor" | "Conductor-like";
}

export function carrierConcentrations(material: Material, dopingType: "none" | "n-type" | "p-type", dopingConc: number): CarrierConcentrations {
  const ni = INTRINSIC_CONC_CM3[material];
  let n: number;
  let p: number;
  let majority: CarrierConcentrations["majority"] = "none";

  if (dopingType === "none") {
    n = ni;
    p = ni;
  } else if (dopingType === "n-type") {
    n = dopingConc;
    p = (ni * ni) / dopingConc;
    majority = "electrons";
  } else {
    p = dopingConc;
    n = (ni * ni) / dopingConc;
    majority = "holes";
  }

  const totalCarriers = n + p;
  const conductivityLabel: CarrierConcentrations["conductivityLabel"] =
    totalCarriers < 1e11 ? "Insulator-like" : totalCarriers < 1e17 ? "Semiconductor" : "Conductor-like";

  return { electronConc: n, holeConc: p, intrinsicConc: ni, majority, conductivityLabel };
}

/** Fermi level offset from the intrinsic (midgap) level, in eV: (E_F - E_i) = V_T * ln(n/n_i). */
export function fermiLevelOffsetEv(electronConc: number, intrinsicConc: number, tempK: number): number {
  return thermalVoltage(tempK) * Math.log(electronConc / intrinsicConc);
}

// ---------- Mode 2: p-n junction electrostatics ----------

export interface JunctionResult {
  builtInPotentialV: number;
  depletionWidthM: number;
  depletionWidthUm: number;
  maxFieldVPerCm: number;
  depletionOnPside: number; // fraction 0..1 of W on the p-side (for asymmetric junctions)
  depletionOnNside: number;
}

/** Converts a cm^-3 concentration to m^-3. */
function toM3(concCm3: number): number {
  return concCm3 * 1e6;
}

export function junctionElectrostatics(material: Material, tempK: number, naCm3: number, ndCm3: number, biasV: number): JunctionResult {
  const VT = thermalVoltage(tempK);
  const ni = INTRINSIC_CONC_CM3[material];
  const builtInPotentialV = VT * Math.log((naCm3 * ndCm3) / (ni * ni));

  const effectiveV = Math.min(biasV, builtInPotentialV - 0.01); // cannot exceed Vbi (would forward-conduct heavily)
  const potentialDrop = Math.max(builtInPotentialV - effectiveV, 0.001);

  const epsS = RELATIVE_PERMITTIVITY[material] * EPS0;
  const NA = toM3(naCm3);
  const ND = toM3(ndCm3);
  const W = Math.sqrt(((2 * epsS) / ELECTRON_CHARGE) * (1 / NA + 1 / ND) * potentialDrop);

  const maxFieldVPerM = (2 * potentialDrop) / W;
  const maxFieldVPerCm = maxFieldVPerM / 100;

  // depletion splits inversely with doping (higher-doped side has thinner depletion)
  const depletionOnPside = ND / (NA + ND); // xp is smaller when NA is larger
  const depletionOnNside = NA / (NA + ND);

  return {
    builtInPotentialV,
    depletionWidthM: W,
    depletionWidthUm: W * 1e6,
    maxFieldVPerCm,
    depletionOnPside,
    depletionOnNside,
  };
}

// ---------- Mode 3: Shockley diode equation ----------

export interface DiodeIVResult {
  currentA: number;
  dynamicResistanceOhm: number;
  powerW: number;
}

/** I_S(T) using the standard I_S proportional to T^3 * exp(-Eg / kT) temperature dependence. */
export function saturationCurrent(material: Material, tempK: number, referenceTempK = 300): number {
  const isRef = REFERENCE_IS_A[material];
  const egJ = BAND_GAP_EV[material] * ELECTRON_CHARGE;
  const ratio = Math.pow(tempK / referenceTempK, 3) * Math.exp((egJ / BOLTZMANN_K) * (1 / referenceTempK - 1 / tempK));
  return isRef * ratio;
}

export function shockleyDiode(isAmps: number, voltageV: number, idealityFactor: number, tempK: number): DiodeIVResult {
  const VT = thermalVoltage(tempK);
  const exponent = voltageV / (idealityFactor * VT);
  // clamp to avoid overflow at extreme forward voltages
  const clampedExp = Math.min(exponent, 80);
  const currentA = isAmps * (Math.exp(clampedExp) - 1);
  const dynamicResistanceOhm = currentA > 1e-15 ? (idealityFactor * VT) / (currentA + isAmps) : Infinity;
  const powerW = voltageV * currentA;
  return { currentA, dynamicResistanceOhm, powerW };
}

// ---------- Mode 4: Rectification ----------

export interface RectifierResult {
  vdcV: number;
  ripplePeakToPeakV: number;
  rippleRmsV: number;
  rippleFactor: number;
  efficiencyPercent: number;
  pivV: number;
  outputFrequencyHz: number;
}

export function diodeDropFor(model: DiodeModel): number {
  if (model === "ideal") return 0;
  return TYPICAL_VF[model];
}

export function rectifierAnalysis(
  circuit: "half-wave" | "full-wave" | "full-wave-capacitor",
  vPeakIn: number,
  freqHz: number,
  loadOhm: number,
  capacitanceF: number,
  diodeModel: DiodeModel
): RectifierResult {
  const drop = diodeDropFor(diodeModel);
  const dropCount = circuit === "half-wave" ? 1 : 2; // bridge = 2 diode drops in series
  const vPeakAfterDiode = Math.max(0, vPeakIn - drop * dropCount);
  const isFullWave = circuit !== "half-wave";
  const outputFrequencyHz = isFullWave ? 2 * freqHz : freqHz;

  if (circuit !== "full-wave-capacitor") {
    const vdcV = isFullWave ? (2 * vPeakAfterDiode) / Math.PI : vPeakAfterDiode / Math.PI;
    const rippleFactor = isFullWave ? 0.482 : 1.211;
    const rippleRmsV = rippleFactor * vdcV;
    const ripplePeakToPeakV = rippleRmsV * 2 * Math.sqrt(3);
    const pAC = (vPeakAfterDiode * vPeakAfterDiode) / (2 * loadOhm);
    const pDC = (vdcV * vdcV) / loadOhm;
    const efficiencyPercent = pAC > 0 ? Math.min(100, (pDC / pAC) * 100) : 0;
    const pivV = isFullWave ? vPeakIn : 2 * vPeakIn - drop;
    return { vdcV, ripplePeakToPeakV, rippleRmsV, rippleFactor, efficiencyPercent, pivV, outputFrequencyHz };
  }

  // full-wave with capacitor filter: iterate VDC ~ Vpeak - Vr/2 to convergence
  let vdcV = vPeakAfterDiode * 0.9;
  for (let i = 0; i < 8; i++) {
    const idc = vdcV / loadOhm;
    const ripplePeakToPeakV = idc / (outputFrequencyHz * capacitanceF);
    vdcV = Math.max(0, vPeakAfterDiode - ripplePeakToPeakV / 2);
  }
  const idc = vdcV / loadOhm;
  const ripplePeakToPeakV = idc / (outputFrequencyHz * capacitanceF);
  const rippleRmsV = ripplePeakToPeakV / (2 * Math.sqrt(3));
  const rippleFactor = vdcV > 0 ? rippleRmsV / vdcV : 0;
  const pAC = (vPeakAfterDiode * vPeakAfterDiode) / (2 * loadOhm);
  const pDC = (vdcV * vdcV) / loadOhm;
  const efficiencyPercent = pAC > 0 ? Math.min(100, (pDC / pAC) * 100) : 0;
  const pivV = 2 * vPeakIn - drop;

  return { vdcV, ripplePeakToPeakV, rippleRmsV, rippleFactor, efficiencyPercent, pivV, outputFrequencyHz };
}

/** Instantaneous rectified output voltage at time t, for drawing the oscilloscope trace. */
export function rectifiedInstant(
  circuit: "half-wave" | "full-wave" | "full-wave-capacitor",
  vPeakIn: number,
  freqHz: number,
  diodeModel: DiodeModel,
  t: number
): { inputV: number; outputV: number } {
  const drop = diodeDropFor(diodeModel);
  const dropCount = circuit === "half-wave" ? 1 : 2;
  const inputV = vPeakIn * Math.sin(2 * Math.PI * freqHz * t);

  if (circuit === "half-wave") {
    const outputV = inputV > drop ? inputV - drop : 0;
    return { inputV, outputV };
  }
  // full-wave (bridge): rectify magnitude
  const rectified = Math.abs(inputV);
  const outputV = rectified > drop * dropCount ? rectified - drop * dropCount : 0;
  return { inputV, outputV };
}

// ---------- Mode 5: Transistors ----------

export interface TransistorSwitchResult {
  baseCurrentA: number;
  collectorCurrentA: number;
  emitterCurrentA: number;
  vce: number;
  region: "cutoff" | "saturation";
  ledOn: boolean;
  powerW: number;
}

export function transistorSwitch(
  vIn: number,
  baseResistorOhm: number,
  vbeOn: number,
  beta: number,
  vcc: number,
  collectorLoadOhm: number
): TransistorSwitchResult {
  if (vIn < vbeOn) {
    return { baseCurrentA: 0, collectorCurrentA: 0, emitterCurrentA: 0, vce: vcc, region: "cutoff", ledOn: false, powerW: 0 };
  }
  const baseCurrentA = (vIn - vbeOn) / baseResistorOhm;
  const idealCollectorCurrentA = beta * baseCurrentA;
  // saturation cap: collector current limited by Vcc/Rc once Vce -> ~0.2V
  const satCollectorCurrentA = (vcc - 0.2) / collectorLoadOhm;
  const collectorCurrentA = Math.min(idealCollectorCurrentA, satCollectorCurrentA);
  const saturated = collectorCurrentA >= satCollectorCurrentA * 0.999;
  const vce = saturated ? 0.2 : Math.max(0.2, vcc - collectorCurrentA * collectorLoadOhm);
  const emitterCurrentA = baseCurrentA + collectorCurrentA;
  return {
    baseCurrentA,
    collectorCurrentA,
    emitterCurrentA,
    vce,
    region: "saturation",
    ledOn: true,
    powerW: vce * collectorCurrentA,
  };
}

export interface AmplifierResult {
  emitterCurrentA: number;
  reOhm: number;
  voltageGain: number;
  outputAmplitudeV: number;
  clipped: boolean;
}

export function transistorAmplifier(
  inputAmplitudeV: number,
  collectorResistorOhm: number,
  vcc: number,
  tempK: number
): AmplifierResult {
  const VT = thermalVoltage(tempK);
  // Assumes the bias network (not modeled in detail here) is designed for maximum
  // symmetric swing, i.e. quiescent Ic ~ Vcc / (2*Rc) — the standard mid-rail design target.
  const emitterCurrentA = vcc / (2 * collectorResistorOhm);
  const reOhm = VT / Math.max(emitterCurrentA, 1e-9);
  const voltageGain = -collectorResistorOhm / reOhm;
  const rawOutput = Math.abs(voltageGain) * inputAmplitudeV;
  const maxSwing = Math.min(vcc - 0.2, emitterCurrentA * collectorResistorOhm);
  const outputAmplitudeV = Math.min(rawOutput, maxSwing);
  const clipped = rawOutput > maxSwing;
  return { emitterCurrentA, reOhm, voltageGain, outputAmplitudeV, clipped };
}

import { ConductionMaterial, ConvectionFluid, Phase, PhaseChangeSubstance, SpecificHeatMaterial, SurfaceFinish } from "./types";

export const STEFAN_BOLTZMANN = 5.67e-8; // W/m^2K^4

export function toKelvin(celsius: number): number {
  return celsius + 273.15;
}

// ---------- Mode 2: Conduction ----------

export const THERMAL_CONDUCTIVITY: Record<ConductionMaterial, number> = {
  copper: 400,
  aluminum: 205,
  iron: 80,
  glass: 1.0,
  wood: 0.1,
  styrofoam: 0.03,
};

export function conductionHeatRate(kWmK: number, areaM2: number, deltaTempC: number, lengthM: number): number {
  return (kWmK * areaM2 * deltaTempC) / lengthM;
}

export function thermalResistance(lengthM: number, kWmK: number, areaM2: number): number {
  return lengthM / (kWmK * areaM2);
}

export function compositeResistance(resistances: number[]): number {
  return resistances.reduce((s, r) => s + r, 0);
}

// ---- Real transient 1D conduction (explicit finite-difference heat equation) ----
// dT/dt = alpha * d2T/dx2, alpha = k/(rho*c). We don't need rho*c individually for a
// qualitatively-correct transient approach to steady state, so we use a nominal
// thermal diffusivity scaled from k so that better conductors visibly equilibrate faster.

export interface RodState {
  temps: Float64Array;
  n: number;
  dx: number;
}

export function createRod(n: number, lengthM: number, hotTempC: number, coldTempC: number, uniformStartTempC: number): RodState {
  const temps = new Float64Array(n).fill(uniformStartTempC);
  temps[0] = hotTempC;
  temps[n - 1] = coldTempC;
  return { temps, n, dx: lengthM / (n - 1) };
}

/** Nominal diffusivity, scaled so a 400 W/m.K conductor visibly reaches steady-state
 * within a few seconds of sim time while styrofoam takes much longer — matches the
 * qualitative "metals equilibrate fast, insulators slowly" teaching point without
 * needing real (and visually-too-slow) density/specific-heat data for a classroom rod. */
export function nominalDiffusivity(kWmK: number): number {
  return 5e-3 * kWmK;
}

export function stepRod(rod: RodState, kWmK: number, dt: number, hotTempC: number, coldTempC: number): void {
  const alpha = nominalDiffusivity(kWmK);
  const { temps, n, dx } = rod;
  const next = new Float64Array(n);
  next[0] = hotTempC;
  next[n - 1] = coldTempC;
  const r = (alpha * dt) / (dx * dx);
  for (let i = 1; i < n - 1; i++) {
    next[i] = temps[i] + r * (temps[i + 1] - 2 * temps[i] + temps[i - 1]);
  }
  rod.temps.set(next);
}

export function stableConductionDt(dx: number, kWmK: number): number {
  const alpha = nominalDiffusivity(kWmK);
  return (0.4 * dx * dx) / Math.max(alpha, 1e-9);
}

// ---------- Mode 3: Convection ----------

const NATURAL_H: Record<ConvectionFluid, number> = { air: 10, water: 300, oil: 60 };
const FORCED_H_MAX: Record<ConvectionFluid, number> = { air: 100, water: 1000, oil: 300 };

export function convectionCoefficient(fluid: ConvectionFluid, type: "natural" | "forced", fanFraction: number): number {
  if (type === "natural") return NATURAL_H[fluid];
  return NATURAL_H[fluid] + (FORCED_H_MAX[fluid] - NATURAL_H[fluid]) * fanFraction;
}

export function convectionHeatRate(hWm2K: number, areaM2: number, deltaTempC: number): number {
  return hWm2K * areaM2 * deltaTempC;
}

/** Newton's Law of Cooling, integrated one step: dT/dt = -hA/(mc) * (T - Tenv). */
export function newtonCoolingStep(tempC: number, envTempC: number, hWm2K: number, areaM2: number, massKg: number, specificHeat: number, dt: number): number {
  const rate = (hWm2K * areaM2) / (massKg * specificHeat);
  return envTempC + (tempC - envTempC) * Math.exp(-rate * dt);
}

// ---------- Mode 4: Radiation ----------

export const EMISSIVITY: Record<SurfaceFinish, number> = {
  black: 0.95,
  white: 0.9,
  "shiny-metal": 0.05,
  red: 0.85,
  blue: 0.85,
};

export function radiatedPower(emissivity: number, areaM2: number, tempK: number): number {
  return emissivity * STEFAN_BOLTZMANN * areaM2 * tempK ** 4;
}

export function netRadiation(emissivity: number, areaM2: number, tempObjK: number, tempSurrK: number): number {
  return emissivity * STEFAN_BOLTZMANN * areaM2 * (tempObjK ** 4 - tempSurrK ** 4);
}

// ---------- Mode 5: Specific heat capacity ----------

export const SPECIFIC_HEAT: Record<SpecificHeatMaterial, number> = {
  water: 4186,
  aluminum: 900,
  copper: 385,
  iron: 450,
  air: 1005,
};

export function sensibleHeat(massKg: number, specificHeat: number, deltaTempC: number): number {
  return massKg * specificHeat * deltaTempC;
}

export function specificHeatFromExperiment(powerW: number, timeS: number, massKg: number, deltaTempC: number): number {
  if (Math.abs(deltaTempC) < 1e-9) return Infinity;
  return (powerW * timeS) / (massKg * deltaTempC);
}

export function equilibriumTemp(m1: number, c1: number, T1: number, m2: number, c2: number, T2: number): number {
  return (m1 * c1 * T1 + m2 * c2 * T2) / (m1 * c1 + m2 * c2);
}

// ---------- Mode 6: Phase changes ----------

export interface SubstanceProps {
  label: string;
  meltingPointC: number;
  boilingPointC: number;
  cSolid: number;
  cLiquid: number;
  cGas: number;
  latentFusion: number;
  latentVaporization: number;
}

// Typical/approximate textbook values; real values vary slightly by source and purity.
export const SUBSTANCES: Record<PhaseChangeSubstance, SubstanceProps> = {
  water: { label: "Water", meltingPointC: 0, boilingPointC: 100, cSolid: 2100, cLiquid: 4186, cGas: 2000, latentFusion: 334000, latentVaporization: 2260000 },
  ethanol: { label: "Ethanol", meltingPointC: -114, boilingPointC: 78, cSolid: 2400, cLiquid: 2440, cGas: 1400, latentFusion: 108000, latentVaporization: 846000 },
  aluminum: { label: "Aluminum", meltingPointC: 660, boilingPointC: 2470, cSolid: 900, cLiquid: 1180, cGas: 900, latentFusion: 397000, latentVaporization: 10500000 },
  lead: { label: "Lead", meltingPointC: 327, boilingPointC: 1749, cSolid: 130, cLiquid: 130, cGas: 130, latentFusion: 23000, latentVaporization: 858000 },
  nitrogen: { label: "Nitrogen", meltingPointC: -210, boilingPointC: -196, cSolid: 1040, cLiquid: 2042, cGas: 1040, latentFusion: 25700, latentVaporization: 199000 },
};

/** Empirical approximation calibrated to water (0.5 atm -> ~82C), applied as a general
 * boiling-point-vs-pressure shift for teaching purposes (real Clausius-Clapeyron behavior
 * differs by substance). */
export function boilingPointAtPressure(normalBoilingPointC: number, pressureAtm: number): number {
  return normalBoilingPointC + 26 * Math.log(Math.max(pressureAtm, 0.05));
}

export interface PhaseStage {
  name: string;
  kind: "sensible" | "latent";
  phase: Phase;
  energy: number; // total energy this stage requires (J), always positive
  tempStart: number;
  tempEnd: number; // equals tempStart for latent stages
}

function buildHeatingStages(substance: SubstanceProps, massKg: number, startPhase: "solid" | "liquid" | "gas", startTempC: number, maxGasTempC: number): PhaseStage[] {
  const stages: PhaseStage[] = [];
  let phase = startPhase;
  let temp = startTempC;

  if (phase === "solid") {
    if (temp < substance.meltingPointC) {
      stages.push({ name: "Heat solid", kind: "sensible", phase: "solid", energy: massKg * substance.cSolid * (substance.meltingPointC - temp), tempStart: temp, tempEnd: substance.meltingPointC });
      temp = substance.meltingPointC;
    }
    stages.push({ name: "Melting", kind: "latent", phase: "melting", energy: massKg * substance.latentFusion, tempStart: temp, tempEnd: temp });
    phase = "liquid";
  }
  if (phase === "liquid") {
    if (temp < substance.boilingPointC) {
      stages.push({ name: "Heat liquid", kind: "sensible", phase: "liquid", energy: massKg * substance.cLiquid * (substance.boilingPointC - temp), tempStart: temp, tempEnd: substance.boilingPointC });
      temp = substance.boilingPointC;
    }
    stages.push({ name: "Boiling", kind: "latent", phase: "boiling", energy: massKg * substance.latentVaporization, tempStart: temp, tempEnd: temp });
    phase = "gas";
  }
  if (phase === "gas" && temp < maxGasTempC) {
    stages.push({ name: "Heat gas", kind: "sensible", phase: "gas", energy: massKg * substance.cGas * (maxGasTempC - temp), tempStart: temp, tempEnd: maxGasTempC });
  }
  return stages;
}

function buildCoolingStages(substance: SubstanceProps, massKg: number, startPhase: "solid" | "liquid" | "gas", startTempC: number, minSolidTempC: number): PhaseStage[] {
  const stages: PhaseStage[] = [];
  let phase = startPhase;
  let temp = startTempC;

  if (phase === "gas") {
    if (temp > substance.boilingPointC) {
      stages.push({ name: "Cool gas", kind: "sensible", phase: "gas", energy: massKg * substance.cGas * (temp - substance.boilingPointC), tempStart: temp, tempEnd: substance.boilingPointC });
      temp = substance.boilingPointC;
    }
    stages.push({ name: "Condensing", kind: "latent", phase: "boiling", energy: massKg * substance.latentVaporization, tempStart: temp, tempEnd: temp });
    phase = "liquid";
  }
  if (phase === "liquid") {
    if (temp > substance.meltingPointC) {
      stages.push({ name: "Cool liquid", kind: "sensible", phase: "liquid", energy: massKg * substance.cLiquid * (temp - substance.meltingPointC), tempStart: temp, tempEnd: substance.meltingPointC });
      temp = substance.meltingPointC;
    }
    stages.push({ name: "Freezing", kind: "latent", phase: "melting", energy: massKg * substance.latentFusion, tempStart: temp, tempEnd: temp });
    phase = "solid";
  }
  if (phase === "solid" && temp > minSolidTempC) {
    stages.push({ name: "Cool solid", kind: "sensible", phase: "solid", energy: massKg * substance.cSolid * (temp - minSolidTempC), tempStart: temp, tempEnd: minSolidTempC });
  }
  return stages;
}

export interface PhaseSimResult {
  tempC: number;
  phase: Phase;
  stageIndex: number;
  stages: (PhaseStage & { used: number; fraction: number })[];
  totalEnergy: number;
  cumulativeEnergy: number;
  complete: boolean;
}

export function simulatePhaseChange(
  substance: SubstanceProps,
  massKg: number,
  startPhase: "solid" | "liquid" | "gas",
  startTempC: number,
  cumulativeEnergyJ: number,
  direction: "heat" | "cool",
  extentC: number // how far beyond the last transition to allow heating/cooling
): PhaseSimResult {
  const stages =
    direction === "heat"
      ? buildHeatingStages(substance, massKg, startPhase, startTempC, extentC)
      : buildCoolingStages(substance, massKg, startPhase, startTempC, extentC);

  const totalEnergy = stages.reduce((s, st) => s + st.energy, 0);
  let remaining = Math.max(0, Math.min(cumulativeEnergyJ, totalEnergy));
  let tempC = startTempC;
  let phase: Phase = stages[0]?.phase ?? (startPhase as Phase);
  let stageIndex = 0;

  const annotated = stages.map((st, i) => {
    const used = Math.max(0, Math.min(remaining, st.energy));
    remaining -= used;
    const fraction = st.energy > 0 ? used / st.energy : used > 0 ? 1 : 0;
    if (used > 0) {
      stageIndex = i;
      phase = st.phase;
      tempC = st.kind === "sensible" ? st.tempStart + (st.tempEnd - st.tempStart) * fraction : st.tempStart;
    }
    return { ...st, used, fraction };
  });

  const complete = cumulativeEnergyJ >= totalEnergy;
  return { tempC, phase, stageIndex, stages: annotated, totalEnergy, cumulativeEnergy: Math.min(cumulativeEnergyJ, totalEnergy), complete };
}

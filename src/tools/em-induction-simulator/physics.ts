// ---------- Mode 1/2/3: magnet-and-coil flux model ----------
// A real bar-magnet-through-solenoid flux-linkage curve requires numerically integrating
// the dipole field over the coil; for a teaching sim we use a smooth bell-shaped
// approximation (Lorentzian) that has all the right qualitative features Faraday's Law
// cares about: Φ is maximum when the magnet is centered in the coil, falls off smoothly
// with distance, and dΦ/dx (hence dΦ/dt) is zero at the center and peaks on either side —
// exactly matching "EMF is zero at the moment of closest approach, next to it it's max."

const COIL_REACH_M = 0.04; // length scale over which the coil "feels" the magnet

export function fluxAtPosition(xMeters: number, bTesla: number, areaM2: number): number {
  const shape = 1 / (1 + (xMeters / COIL_REACH_M) ** 2);
  return bTesla * areaM2 * shape;
}

/** Analytic derivative dΦ/dx for the same bell-shaped flux model. */
export function fluxSlopeAtPosition(xMeters: number, bTesla: number, areaM2: number): number {
  const k = 1 / COIL_REACH_M ** 2;
  const denom = (1 + k * xMeters * xMeters) ** 2;
  return (-2 * bTesla * areaM2 * k * xMeters) / denom;
}

export interface FaradayResult {
  fluxWb: number;
  dPhiDt: number;
  emfV: number;
  currentA: number;
}

export function faradayAtPosition(xMeters: number, velocityMps: number, turns: number, bTesla: number, areaM2: number, coilResistanceOhm: number): FaradayResult {
  const fluxWb = fluxAtPosition(xMeters, bTesla, areaM2);
  const dPhiDx = fluxSlopeAtPosition(xMeters, bTesla, areaM2);
  const dPhiDt = dPhiDx * velocityMps;
  const emfV = -turns * dPhiDt;
  const currentA = emfV / coilResistanceOhm;
  return { fluxWb, dPhiDt, emfV, currentA };
}

// ---------- Mode 4: AC generator (rotating coil) ----------

export interface AcGeneratorResult {
  fluxWb: number;
  emfInstantV: number;
  peakEmfV: number;
  rmsV: number;
  frequencyHz: number;
  currentInstantA: number;
  rmsA: number;
  powerW: number;
}

export function acGenerator(turns: number, bTesla: number, areaM2: number, omegaRadPerS: number, thetaRad: number, loadOhm: number): AcGeneratorResult {
  const fluxWb = bTesla * areaM2 * Math.cos(thetaRad);
  const peakEmfV = turns * bTesla * areaM2 * omegaRadPerS;
  const emfInstantV = peakEmfV * Math.sin(thetaRad);
  const rmsV = peakEmfV / Math.SQRT2;
  const frequencyHz = omegaRadPerS / (2 * Math.PI);
  const currentInstantA = emfInstantV / loadOhm;
  const rmsA = rmsV / loadOhm;
  const powerW = rmsV * rmsA;
  return { fluxWb, emfInstantV, peakEmfV, rmsV, frequencyHz, currentInstantA, rmsA, powerW };
}

export function rpmToOmega(rpm: number): number {
  return (rpm * 2 * Math.PI) / 60;
}

// ---------- Mode 5: DC generator (commutator) & DC motor ----------

/** Commutator effectively rectifies the AC waveform (full-wave), giving a pulsating DC of the same polarity. */
export function dcGeneratorOutput(peakEmfV: number, thetaRad: number): number {
  return Math.abs(peakEmfV * Math.sin(thetaRad));
}

export const DC_AVERAGE_FACTOR = 2 / Math.PI; // V_avg = (2/pi) * V_peak, for a single-coil full-wave rectified sine

export interface MotorState {
  omegaRadPerS: number;
  backEmfV: number;
  netVoltageV: number;
  currentA: number;
  torqueNm: number;
}

/**
 * One integration step of simple DC-motor dynamics: current is set instantaneously by
 * V_net/R (armature inductance neglected, standard simplification here), torque drives
 * angular acceleration against a load torque, and back-EMF grows with speed until it
 * balances the supply (equilibrium at no load).
 */
export function motorStep(
  prevOmega: number,
  supplyV: number,
  turns: number,
  bTesla: number,
  areaM2: number,
  armatureResistanceOhm: number,
  loadTorqueFraction: number,
  momentOfInertia: number,
  dt: number
): MotorState {
  const backEmfV = turns * bTesla * areaM2 * prevOmega;
  const netVoltageV = Math.max(0, supplyV - backEmfV);
  const currentA = netVoltageV / armatureResistanceOhm;
  const torqueConstant = turns * bTesla * areaM2;
  const driveTorqueNm = torqueConstant * currentA * (2 / Math.PI); // average over rotation
  const stallTorqueEstimate = torqueConstant * (supplyV / armatureResistanceOhm) * (2 / Math.PI);
  const loadTorqueNm = loadTorqueFraction * stallTorqueEstimate;
  const netTorqueNm = driveTorqueNm - loadTorqueNm;
  const angularAccel = netTorqueNm / momentOfInertia;
  const omegaRadPerS = Math.max(0, prevOmega + angularAccel * dt);
  return { omegaRadPerS, backEmfV, netVoltageV, currentA, torqueNm: driveTorqueNm };
}

// ---------- Mode 6: Transformers ----------

export interface TransformerResult {
  turnsRatio: number;
  secondaryVoltageV: number;
  secondaryCurrentA: number;
  primaryCurrentA: number;
  inputPowerW: number;
  outputPowerW: number;
  efficiencyPercent: number;
  fluxMaxWb: number;
  coreFluxDensityT: number;
}

const CORE_COUPLING: Record<"air" | "iron" | "ferrite", number> = { air: 0.05, iron: 0.98, ferrite: 0.95 };

export function analyzeTransformer(
  primaryVoltageV: number,
  frequencyHz: number,
  primaryTurns: number,
  secondaryTurns: number,
  coreMaterial: "air" | "iron" | "ferrite",
  loadOhm: number,
  fidelity: "ideal" | "real",
  coreAreaM2 = 0.001
): TransformerResult {
  const turnsRatio = secondaryTurns / primaryTurns;
  const coupling = CORE_COUPLING[coreMaterial];
  const idealSecondaryV = primaryVoltageV * turnsRatio * coupling;

  const copperLossFactor = fidelity === "real" ? 0.03 : 0;
  const ironLossFactor = fidelity === "real" ? 0.02 : 0;

  const secondaryVoltageV = idealSecondaryV * (1 - copperLossFactor);
  const secondaryCurrentA = secondaryVoltageV / loadOhm;
  const idealPrimaryCurrentA = secondaryCurrentA / turnsRatio;
  const primaryCurrentA = idealPrimaryCurrentA * (1 + copperLossFactor + ironLossFactor);

  const outputPowerW = secondaryVoltageV * secondaryCurrentA;
  const inputPowerW = primaryVoltageV * primaryCurrentA;
  const efficiencyPercent = inputPowerW > 0 ? Math.min(100, (outputPowerW / inputPowerW) * 100) : 0;

  // V_p = 4.44 f N_p Phi_m  =>  Phi_m = V_p / (4.44 f N_p)
  const fluxMaxWb = primaryVoltageV / (4.44 * frequencyHz * primaryTurns);
  const coreFluxDensityT = fluxMaxWb / coreAreaM2;

  return { turnsRatio, secondaryVoltageV, secondaryCurrentA, primaryCurrentA, inputPowerW, outputPowerW, efficiencyPercent, fluxMaxWb, coreFluxDensityT };
}

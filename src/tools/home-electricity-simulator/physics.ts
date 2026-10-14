import { Appliance, ApplianceKey, CircuitTopology } from "./types";

// ---------- Mode 1: Basic circuit analysis (Ohm's law, series/parallel) ----------

export interface CircuitResult {
  bulbResistanceOhm: number;
  totalResistanceOhm: number;
  totalCurrentA: number;
  perBulbCurrentA: number;
  perBulbVoltageV: number;
  perBulbPowerW: number;
  totalPowerW: number;
  brightnessFraction: number; // 0..1, relative to rated power
}

/**
 * Each bulb's resistance is derived from its rated power at the supply voltage
 * (R = V^2 / P) — i.e. "this bulb would dissipate its rated wattage if the full
 * supply voltage were across it alone," the standard simplification for this
 * kind of teaching circuit.
 */
export function analyzeBasicCircuit(topology: CircuitTopology, numBulbs: number, supplyVoltageV: number, bulbRatedW: number): CircuitResult {
  const bulbResistanceOhm = (supplyVoltageV * supplyVoltageV) / bulbRatedW;

  let totalResistanceOhm: number;
  let totalCurrentA: number;
  let perBulbCurrentA: number;
  let perBulbVoltageV: number;

  if (topology === "series") {
    totalResistanceOhm = bulbResistanceOhm * numBulbs;
    totalCurrentA = supplyVoltageV / totalResistanceOhm;
    perBulbCurrentA = totalCurrentA; // same current throughout
    perBulbVoltageV = totalCurrentA * bulbResistanceOhm; // voltage divides
  } else {
    totalResistanceOhm = bulbResistanceOhm / numBulbs;
    perBulbVoltageV = supplyVoltageV; // same voltage across each branch
    perBulbCurrentA = perBulbVoltageV / bulbResistanceOhm;
    totalCurrentA = perBulbCurrentA * numBulbs; // current divides/sums
  }

  const perBulbPowerW = perBulbVoltageV * perBulbCurrentA;
  const totalPowerW = perBulbPowerW * numBulbs;
  const brightnessFraction = Math.max(0, Math.min(1, perBulbPowerW / bulbRatedW));

  return { bulbResistanceOhm, totalResistanceOhm, totalCurrentA, perBulbCurrentA, perBulbVoltageV, perBulbPowerW, totalPowerW, brightnessFraction };
}

// ---------- Mode 2: Household wiring ----------

export interface WireGauge {
  mm2: number;
  minA: number;
  maxA: number;
}

export const WIRE_GAUGES: WireGauge[] = [
  { mm2: 1.0, minA: 10, maxA: 13 },
  { mm2: 1.5, minA: 13, maxA: 16 },
  { mm2: 2.5, minA: 20, maxA: 25 },
  { mm2: 4.0, minA: 25, maxA: 32 },
  { mm2: 6.0, minA: 32, maxA: 40 },
  { mm2: 10.0, minA: 40, maxA: 63 },
];

export type WireHeatLabel = "Normal" | "Warm" | "Hot" | "Overheating";

export function wireHeatLabel(currentA: number, wireMaxA: number): WireHeatLabel {
  const ratio = currentA / wireMaxA;
  if (ratio < 0.7) return "Normal";
  if (ratio < 1.0) return "Warm";
  if (ratio < 1.3) return "Hot";
  return "Overheating";
}

// ---------- Mode 3: Safety devices ----------

export interface TripResult {
  tripped: boolean;
  tripTimeMs: number | null; // null = will not trip
  mechanism: "thermal" | "magnetic" | "none";
}

/** Simplified inverse-time (I^2t-like) characteristic: t = k / (I/Irating - 1)^2 for I > Irating. */
export function fuseTripTime(currentA: number, ratingA: number, kSeconds = 5): TripResult {
  const m = currentA / ratingA;
  if (m <= 1.0) return { tripped: false, tripTimeMs: null, mechanism: "none" };
  const tSeconds = kSeconds / (m - 1) ** 2;
  return { tripped: true, tripTimeMs: tSeconds * 1000, mechanism: "thermal" };
}

export type McbType = "B" | "C" | "D";
export const MCB_INSTANT_MULTIPLIER: Record<McbType, number> = { B: 5, C: 10, D: 20 };

export function mcbTripTime(currentA: number, ratingA: number, type: McbType): TripResult {
  const m = currentA / ratingA;
  const instantMultiplier = MCB_INSTANT_MULTIPLIER[type];
  if (m >= instantMultiplier) {
    return { tripped: true, tripTimeMs: 8 + Math.random() * 4, mechanism: "magnetic" };
  }
  if (m > 1.0) {
    const tSeconds = 2 / (m - 1) ** 2;
    return { tripped: true, tripTimeMs: tSeconds * 1000, mechanism: "thermal" };
  }
  return { tripped: false, tripTimeMs: null, mechanism: "none" };
}

export function rcdTripTime(leakageMa: number, sensitivityMa: number): TripResult {
  if (leakageMa >= 5 * sensitivityMa) return { tripped: true, tripTimeMs: 20 + Math.random() * 15, mechanism: "magnetic" };
  if (leakageMa >= sensitivityMa) return { tripped: true, tripTimeMs: 150 + Math.random() * 140, mechanism: "magnetic" };
  return { tripped: false, tripTimeMs: null, mechanism: "none" };
}

export function shockSeverity(currentMa: number): string {
  if (currentMa < 1) return "Below perception threshold";
  if (currentMa < 5) return "Barely perceptible";
  if (currentMa < 30) return "Painful, muscle control lost";
  if (currentMa < 100) return "Breathing difficulty — dangerous";
  if (currentMa < 200) return "Ventricular fibrillation risk — potentially fatal";
  return "Severe burns, cardiac arrest — likely fatal";
}

// ---------- Mode 4: Power & energy ----------

export const APPLIANCES: Appliance[] = [
  { key: "led-bulb", label: "LED Bulb", typicalWatts: 10 },
  { key: "incandescent-bulb", label: "Incandescent Bulb", typicalWatts: 60 },
  { key: "fan", label: "Ceiling Fan", typicalWatts: 75 },
  { key: "fridge-old", label: "Refrigerator (old)", typicalWatts: 400 },
  { key: "fridge-new", label: "Refrigerator (5-star)", typicalWatts: 150 },
  { key: "tv", label: "TV", typicalWatts: 120 },
  { key: "heater", label: "Space Heater", typicalWatts: 2000 },
  { key: "ac", label: "Air Conditioner", typicalWatts: 1500 },
  { key: "washing-machine", label: "Washing Machine", typicalWatts: 500 },
  { key: "iron", label: "Clothes Iron", typicalWatts: 1000 },
  { key: "kettle", label: "Electric Kettle", typicalWatts: 2000 },
];

export function applianceByKey(key: ApplianceKey): Appliance {
  return APPLIANCES.find((a) => a.key === key) ?? APPLIANCES[0];
}

export interface EnergyResult {
  instantPowerW: number;
  energyKwh: number;
  costCurrency: number;
}

export function energyAndCost(powerW: number, count: number, hoursPerDay: number, days: number, tariffPerKwh: number): EnergyResult {
  const instantPowerW = powerW * count;
  const energyKwh = (instantPowerW / 1000) * hoursPerDay * days;
  const costCurrency = energyKwh * tariffPerKwh;
  return { instantPowerW, energyKwh, costCurrency };
}

// ---------- Mode 5: Efficiency ----------

export interface EfficiencyResult {
  outputPowerW: number;
  wastedPowerW: number;
  annualEnergyKwh: number;
  annualCost: number;
  starRating: number; // 1..5
}

export function analyzeEfficiency(inputPowerW: number, efficiencyPercent: number, hoursPerDay: number, daysPerYear: number, tariffPerKwh: number): EfficiencyResult {
  const outputPowerW = inputPowerW * (efficiencyPercent / 100);
  const wastedPowerW = inputPowerW - outputPowerW;
  const annualEnergyKwh = (inputPowerW / 1000) * hoursPerDay * daysPerYear;
  const annualCost = annualEnergyKwh * tariffPerKwh;
  const starRating = Math.max(1, Math.min(5, Math.round(1 + (efficiencyPercent / 100) * 4)));
  return { outputPowerW, wastedPowerW, annualEnergyKwh, annualCost, starRating };
}

export function paybackYears(extraPurchaseCost: number, annualSavings: number): number | null {
  if (annualSavings <= 0) return null;
  return extraPurchaseCost / annualSavings;
}

// ---------- Mode 6: Fault diagnosis ----------

export interface FaultSymptoms {
  voltageAtLoad: number;
  currentA: number;
  resistanceOhm: number | null; // null = "cannot measure live" reminder
  continuity: boolean;
  description: string;
}

export function faultSymptoms(fault: "none" | "short-circuit" | "overload" | "earth-fault" | "leakage" | "open-circuit" | "loose-connection", supplyV: number): FaultSymptoms {
  switch (fault) {
    case "open-circuit":
      return { voltageAtLoad: supplyV, currentA: 0, resistanceOhm: Infinity, continuity: false, description: "Broken wire or loose terminal — circuit is not complete." };
    case "short-circuit":
      return { voltageAtLoad: 0, currentA: 999, resistanceOhm: 0, continuity: true, description: "Live touching neutral (or earth) directly — very high current." };
    case "overload":
      return { voltageAtLoad: supplyV * 0.95, currentA: 22, resistanceOhm: 10, continuity: true, description: "Too many appliances drawing current on one circuit." };
    case "earth-fault":
      return { voltageAtLoad: supplyV, currentA: 15, resistanceOhm: 15, continuity: true, description: "Live conductor touching earthed metal casing." };
    case "leakage":
      return { voltageAtLoad: supplyV, currentA: 0.05, resistanceOhm: 4000, continuity: true, description: "Damaged insulation causing small current to leak to earth." };
    case "loose-connection":
      return { voltageAtLoad: supplyV * 0.6, currentA: 3, resistanceOhm: 60, continuity: true, description: "High-resistance joint — localized heating, may not trip MCB." };
    default:
      return { voltageAtLoad: supplyV, currentA: 1, resistanceOhm: supplyV, continuity: true, description: "No fault — circuit operating normally." };
  }
}

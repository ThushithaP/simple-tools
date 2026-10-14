import { BoundaryType, DampingLevel, SoundMedium, StandingWaveGeometry, TensionLevel } from "./types";

// ---------- Shared constants ----------

export const TENSION_SPEED: Record<TensionLevel, number> = { low: 2.2, medium: 4.5, high: 7.5 }; // m/s
export const MEDIUM_SPEED: Record<SoundMedium, number> = { air: 343, water: 1480, steel: 5960 }; // m/s
export const DAMPING_GAMMA: Record<DampingLevel, number> = { none: 0, low: 0.0025, medium: 0.01, high: 0.035 };
export const INTERFERENCE_WAVE_SPEED = 2; // m/s, generic ripple-tank reference speed

/** Scale a "real" medium speed down to something that reads nicely on a small canvas domain. */
export const SOUND_VISUAL_SCALE = 1 / 60; // e.g. 343 m/s -> ~5.7 visual units/s

// ---------- 1D damped wave equation (explicit finite difference) ----------
// d2y/dt2 = c^2 d2y/dx2 - damping, driven at x=0 by a sinusoidal source.
// This is what gives Mode 1 (string) and Mode 2 (sound-in-a-tube) *real* reflection
// behaviour for free (Dirichlet/y=0), loose (Neumann/dy=0), and open (absorbing) ends,
// rather than a canned/faked bounce.

export interface WaveLineState {
  y: Float64Array;
  yPrev: Float64Array;
  n: number;
  dx: number;
}

export function createWaveLine(n: number, dx: number): WaveLineState {
  return { y: new Float64Array(n), yPrev: new Float64Array(n), n, dx };
}

export function resetWaveLine(state: WaveLineState) {
  state.y.fill(0);
  state.yPrev.fill(0);
}

export interface WaveStepParams {
  c: number; // wave speed, visual units/sec
  dt: number;
  amplitude: number;
  angularFreq: number; // 2*pi*f
  time: number;
  boundary: BoundaryType;
  gamma: number; // damping coefficient
}

/** Advances the wave line by one physics step in place. Returns the new "current" array reference. */
export function stepWaveLine(state: WaveLineState, p: WaveStepParams): void {
  const { y, yPrev, n, dx } = state;
  const c2dt2 = (p.c * p.dt) ** 2 / (dx * dx);
  const yNext = new Float64Array(n);

  // driven left boundary
  yNext[0] = p.amplitude * Math.sin(p.angularFreq * p.time);

  for (let i = 1; i < n - 1; i++) {
    const lap = y[i + 1] - 2 * y[i] + y[i - 1];
    yNext[i] = (2 * y[i] - (1 - p.gamma) * yPrev[i] + c2dt2 * lap) / (1 + p.gamma);
  }

  // right boundary
  const last = n - 1;
  if (p.boundary === "fixed") {
    yNext[last] = 0;
  } else if (p.boundary === "loose") {
    // zero-slope (Neumann) end: mirror the neighbour so the end moves in phase, undamped reflection
    const lap = y[last - 1] - 2 * y[last] + y[last - 1];
    yNext[last] = (2 * y[last] - (1 - p.gamma) * yPrev[last] + c2dt2 * lap) / (1 + p.gamma);
  } else {
    // open / absorbing end: first-order Mur absorbing boundary condition (no reflection)
    const k = (p.c * p.dt - dx) / (p.c * p.dt + dx);
    yNext[last] = y[last - 1] + k * (yNext[last - 1] - y[last]);
  }

  state.yPrev.set(y);
  state.y.set(yNext);
}

/** CFL-stable physics timestep for a given grid spacing and wave speed. */
export function stableDt(dx: number, c: number): number {
  return (0.9 * dx) / Math.max(c, 0.001);
}

// ---------- Standing waves (analytic) ----------

export interface StandingWaveInfo {
  wavelength: number;
  frequency: number;
  nodeCount: number;
  antinodeCount: number;
  nodePositions: number[];
  antinodePositions: number[];
}

/**
 * Standing wave analysis for a string (both ends fixed) or a pipe.
 * String / open-open pipe: L = n(lambda/2), all harmonics n=1,2,3...
 * Closed-open pipe: L = n(lambda/4), odd harmonics only n=1,3,5...
 */
export function standingWaveInfo(
  geometry: StandingWaveGeometry,
  harmonicN: number,
  lengthM: number,
  fundamentalFreq: number
): StandingWaveInfo {
  const n = geometry === "pipe-open-closed" ? 2 * harmonicN - 1 : harmonicN;

  const wavelength = geometry === "pipe-open-closed" ? (4 * lengthM) / n : (2 * lengthM) / n;
  const frequency = fundamentalFreq * n;

  const nodePositions: number[] = [];
  const antinodePositions: number[] = [];
  // Analytic positions: sin(kx) = 0 -> x = m*wavelength/2 (nodes);
  // sin(kx) = +/-1 -> x = (m+1/2)*wavelength/2 (antinodes).
  for (let x = 0; x <= lengthM + 1e-9; x += wavelength / 2) {
    nodePositions.push(Math.min(x, lengthM));
  }
  // antinodes at x = (m+1/2)*wavelength/2
  for (let x = wavelength / 4; x <= lengthM + 1e-9; x += wavelength / 2) {
    antinodePositions.push(Math.min(x, lengthM));
  }

  return {
    wavelength,
    frequency,
    nodeCount: nodePositions.length,
    antinodeCount: antinodePositions.length,
    nodePositions,
    antinodePositions,
  };
}

export function standingDisplacement(x: number, t: number, amplitude: number, wavelength: number, freq: number): number {
  const k = (2 * Math.PI) / wavelength;
  const omega = 2 * Math.PI * freq;
  return amplitude * Math.sin(k * x) * Math.cos(omega * t);
}

// ---------- Interference (analytic, two coherent point sources) ----------

export interface InterferenceSample {
  displacement: number;
  pathDifference: number;
  wavelengths: number; // path difference expressed in units of wavelength
  type: "constructive" | "destructive" | "partial";
}

export function interferenceAt(
  x: number,
  y: number,
  sourceAx: number,
  sourceAy: number,
  sourceBx: number,
  sourceBy: number,
  amplitude: number,
  waveSpeed: number,
  freqA: number,
  freqB: number,
  phaseDiffRad: number,
  t: number
): InterferenceSample {
  const r1 = Math.hypot(x - sourceAx, y - sourceAy);
  const r2 = Math.hypot(x - sourceBx, y - sourceBy);
  const kA = (2 * Math.PI * freqA) / waveSpeed;
  const kB = (2 * Math.PI * freqB) / waveSpeed;
  const omegaA = 2 * Math.PI * freqA;
  const omegaB = 2 * Math.PI * freqB;

  const y1 = amplitude * Math.sin(kA * r1 - omegaA * t);
  const y2 = amplitude * Math.sin(kB * r2 - omegaB * t + phaseDiffRad);
  const displacement = y1 + y2;

  const avgFreq = (freqA + freqB) / 2;
  const wavelength = waveSpeed / Math.max(avgFreq, 1e-6);
  const pathDifference = Math.abs(r1 - r2);
  const wavelengths = pathDifference / wavelength;
  const nearestInt = Math.round(wavelengths);
  const distFromInt = Math.abs(wavelengths - nearestInt);
  const distFromHalfInt = Math.abs(wavelengths - (nearestInt + 0.5));

  let type: InterferenceSample["type"] = "partial";
  if (distFromInt < 0.08) type = "constructive";
  else if (distFromHalfInt < 0.08) type = "destructive";

  return { displacement, pathDifference, wavelengths, type };
}

// ---------- Misc helpers ----------

export function periodFromFreq(freq: number): number {
  return freq > 0 ? 1 / freq : Infinity;
}

export function wavelengthFromSpeed(speed: number, freq: number): number {
  return freq > 0 ? speed / freq : 0;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Nearest musical note name for a frequency, using A4 = 440 Hz equal temperament. */
export function nearestNote(freq: number): string {
  if (freq <= 0) return "—";
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

export function loudnessLabel(amplitudeCm: number): string {
  if (amplitudeCm < 25) return "Soft";
  if (amplitudeCm < 70) return "Medium";
  return "Loud";
}

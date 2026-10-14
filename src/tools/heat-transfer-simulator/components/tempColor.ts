const STOPS: { t: number; color: [number, number, number] }[] = [
  { t: 0, color: [74, 144, 226] }, // blue - cold
  { t: 0.25, color: [95, 199, 184] }, // teal
  { t: 0.5, color: [111, 207, 122] }, // green
  { t: 0.75, color: [242, 209, 78] }, // yellow
  { t: 0.9, color: [232, 163, 61] }, // orange
  { t: 1, color: [232, 90, 74] }, // red - hot
];

export function tempToColor(tempC: number, minC: number, maxC: number): string {
  const t = Math.max(0, Math.min(1, (tempC - minC) / Math.max(1e-6, maxC - minC)));
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i].t && t <= STOPS[i + 1].t) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const span = hi.t - lo.t || 1;
  const localT = (t - lo.t) / span;
  const r = Math.round(lo.color[0] + (hi.color[0] - lo.color[0]) * localT);
  const g = Math.round(lo.color[1] + (hi.color[1] - lo.color[1]) * localT);
  const b = Math.round(lo.color[2] + (hi.color[2] - lo.color[2]) * localT);
  return `rgb(${r}, ${g}, ${b})`;
}

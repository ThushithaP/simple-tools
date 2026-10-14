import { useEffect, useRef, useState } from "react";
import { StandingWaveGeometry, TensionLevel } from "../types";
import { TENSION_SPEED, standingDisplacement } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, PlaybackControls, MisconceptionTip } from "../components/Controls";

const CANVAS_W = 720;
const CANVAS_H = 240;
const RESONANCE_TOLERANCE = 0.03; // +/-3%

function nodesAndAntinodes(wavelength: number, lengthM: number) {
  const nodePositions: number[] = [];
  const antinodePositions: number[] = [];
  if (wavelength <= 0) return { nodePositions, antinodePositions };
  for (let x = 0; x <= lengthM + 1e-9; x += wavelength / 2) nodePositions.push(Math.min(x, lengthM));
  for (let x = wavelength / 4; x <= lengthM + 1e-9; x += wavelength / 2) antinodePositions.push(Math.min(x, lengthM));
  return { nodePositions, antinodePositions };
}

export default function StandingWaveMode() {
  const [geometry, setGeometry] = useState<StandingWaveGeometry>("string");
  const [lengthM, setLengthM] = useState(4);
  const [tension, setTension] = useState<TensionLevel>("medium");
  const [amplitudeCm, setAmplitudeCm] = useState(50);
  const [frequency, setFrequency] = useState(1);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const paramsRef = useRef({ geometry, lengthM, tension, amplitudeCm, frequency, running, speed });
  paramsRef.current = { geometry, lengthM, tension, amplitudeCm, frequency, running, speed };

  const v = TENSION_SPEED[tension];
  const fundamental = geometry === "pipe-open-closed" ? v / (4 * lengthM) : v / (2 * lengthM);
  const nearestN = Math.max(1, Math.round(frequency / fundamental));
  const targetN = geometry === "pipe-open-closed" ? 2 * Math.floor(nearestN / 2) + 1 : nearestN; // odd only for closed pipe
  const resonantFreq = fundamental * targetN;
  const deviation = Math.abs(frequency - resonantFreq) / resonantFreq;
  const atResonance = deviation < RESONANCE_TOLERANCE;

  const wavelength = v / Math.max(frequency, 1e-6);
  const { nodePositions, antinodePositions } = nodesAndAntinodes(wavelength, lengthM);

  useEffect(() => {
    let raf: number;
    function frame() {
      const p = paramsRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (p.running) timeRef.current += (1 / 60) * p.speed;
      if (ctx) draw(ctx, p);
      raf = requestAnimationFrame(frame);
    }

    function draw(ctx: CanvasRenderingContext2D, p: typeof paramsRef.current) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#0D1412";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      const midY = CANVAS_H / 2;
      const vNow = TENSION_SPEED[p.tension];
      const fund = p.geometry === "pipe-open-closed" ? vNow / (4 * p.lengthM) : vNow / (2 * p.lengthM);
      const nNear = Math.max(1, Math.round(p.frequency / fund));
      const nTarget = p.geometry === "pipe-open-closed" ? 2 * Math.floor(nNear / 2) + 1 : nNear;
      const resFreq = fund * nTarget;
      const dev = Math.abs(p.frequency - resFreq) / resFreq;
      const isRes = dev < RESONANCE_TOLERANCE;
      const lambda = vNow / Math.max(p.frequency, 1e-6);

      const pxPerM = CANVAS_W / (p.lengthM * 1.15);
      const originX = (CANVAS_W - p.lengthM * pxPerM) / 2;
      const ampPx = (p.amplitudeCm / 100) * 90 * (isRes ? 1 : Math.max(0.15, 1 - dev * 2));

      // equilibrium
      ctx.strokeStyle = "#3A4B48";
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(originX, midY);
      ctx.lineTo(originX + p.lengthM * pxPerM, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // envelope
      ctx.strokeStyle = "#2A3A37";
      ctx.beginPath();
      const steps = 200;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * p.lengthM;
        const env = Math.abs(Math.sin(((2 * Math.PI) / lambda) * x)) * ampPx;
        const px = originX + x * pxPerM;
        if (i === 0) ctx.moveTo(px, midY - env);
        else ctx.lineTo(px, midY - env);
      }
      for (let i = steps; i >= 0; i--) {
        const x = (i / steps) * p.lengthM;
        const env = Math.abs(Math.sin(((2 * Math.PI) / lambda) * x)) * ampPx;
        const px = originX + x * pxPerM;
        ctx.lineTo(px, midY + env);
      }
      ctx.closePath();
      ctx.stroke();

      // instantaneous curve
      ctx.strokeStyle = isRes ? "#5FC7B8" : "#8FA39D";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * p.lengthM;
        const y = standingDisplacement(x, timeRef.current, ampPx, lambda, p.frequency);
        const px = originX + x * pxPerM;
        const py = midY - y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // nodes / antinodes
      const { nodePositions: nodes, antinodePositions: antinodes } = nodesAndAntinodes(lambda, p.lengthM);
      ctx.fillStyle = "#E85A4A";
      nodes.forEach((x) => {
        const px = originX + x * pxPerM;
        ctx.beginPath();
        ctx.arc(px, midY, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#6FCF7A";
      antinodes.forEach((x) => {
        const px = originX + x * pxPerM;
        const y = standingDisplacement(x, timeRef.current, ampPx, lambda, p.frequency);
        ctx.beginPath();
        ctx.arc(px, midY - y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // ends (ticks) for string / boundary reference
      ctx.fillStyle = "#8FA39D";
      ctx.fillRect(originX - 2, midY - 50, 4, 100);
      ctx.fillRect(originX + p.lengthM * pxPerM - 2, midY - 50, 4, 100);

      ctx.font = "11px sans-serif";
      ctx.fillStyle = isRes ? "#5FC7B8" : "#5C726C";
      ctx.fillText(isRes ? "Resonance achieved!" : "Adjust frequency to find resonance…", originX, 20);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  function reset() {
    timeRef.current = 0;
    setRunning(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Geometry"
          value={geometry}
          onChange={setGeometry}
          options={[
            { value: "string", label: "String" },
            { value: "pipe-open-open", label: "Open pipe" },
            { value: "pipe-open-closed", label: "Closed pipe" },
          ]}
        />
        <SliderField label="Length (L)" unit=" m" min={1} max={8} step={0.1} value={lengthM} onChange={setLengthM} />
        <SegmentedField
          label="Tension / medium speed"
          value={tension}
          onChange={setTension}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
        <SliderField label="Amplitude" unit=" cm" min={0} max={100} step={1} value={amplitudeCm} onChange={setAmplitudeCm} />
        <SliderField label="Frequency" unit=" Hz" min={0.1} max={10} step={0.05} value={frequency} onChange={setFrequency} />
        <button
          onClick={() => setFrequency(resonantFreq)}
          className="w-full rounded border border-dashed border-[#3A4B48] py-2 text-xs text-[#8FA39D] hover:border-[#5FC7B8] hover:text-[#5FC7B8] transition-colors"
        >
          Snap to nearest harmonic ({targetN}
          {geometry === "pipe-open-closed" ? " — odd only" : ""})
        </button>
        <EquationBox
          lines={
            geometry === "pipe-open-closed"
              ? [`λₙ = 4L/n (n odd)`, `fₙ = n·v/4L`, `f₁ = ${fundamental.toFixed(2)} Hz`]
              : [`λₙ = 2L/n`, `fₙ = n·v/2L = n×f₁`, `f₁ = ${fundamental.toFixed(2)} Hz`]
          }
        />
        <MisconceptionTip wrong="Standing waves don't move." right="They oscillate in place — energy doesn't travel along the medium, it stays trapped." />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full h-auto rounded" />
          <div className="mt-3">
            <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />
          </div>
        </div>

        <StatGrid
          stats={[
            { label: "Harmonic (n)", value: `${targetN}` },
            { label: "Resonant freq.", value: `${resonantFreq.toFixed(2)} Hz` },
            { label: "Wavelength (λₙ)", value: `${(geometry === "pipe-open-closed" ? (4 * lengthM) / targetN : (2 * lengthM) / targetN).toFixed(2)} m` },
            { label: "Nodes", value: `${nodePositions.length}` },
            { label: "Antinodes", value: `${antinodePositions.length}` },
            { label: "Status", value: atResonance ? "Resonant" : "Off-resonance", muted: !atResonance },
          ]}
        />
      </div>
    </div>
  );
}

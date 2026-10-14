import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoundaryType,
  DampingLevel,
  TensionLevel,
} from "../types";
import {
  DAMPING_GAMMA,
  TENSION_SPEED,
  createWaveLine,
  resetWaveLine,
  stableDt,
  stepWaveLine,
  WaveLineState,
  periodFromFreq,
  wavelengthFromSpeed,
} from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, PlaybackControls, MisconceptionTip } from "../components/Controls";
import WaveChart from "../components/WaveChart";

const DOMAIN_M = 8; // visible string length in meters
const GRID_N = 160;
const CANVAS_W = 720;
const CANVAS_H = 260;
const PX_PER_M_X = CANVAS_W / DOMAIN_M;
const PX_PER_M_Y = 90; // pixels per meter of displacement

export default function StringWaveMode() {
  const [frequency, setFrequency] = useState(2);
  const [amplitudeCm, setAmplitudeCm] = useState(50);
  const [tension, setTension] = useState<TensionLevel>("medium");
  const [damping, setDamping] = useState<DampingLevel>("none");
  const [boundary, setBoundary] = useState<BoundaryType>("fixed");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [snapshot, setSnapshot] = useState<number[]>(new Array(GRID_N).fill(0));
  const [timeHistory, setTimeHistory] = useState<{ x: number; y: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineRef = useRef<WaveLineState | null>(null);
  const timeRef = useRef(0);
  const frameCountRef = useRef(0);
  const historyBufferRef = useRef<{ x: number; y: number }[]>([]);
  const paramsRef = useRef({ frequency, amplitudeCm, tension, damping, boundary, running, speed });
  paramsRef.current = { frequency, amplitudeCm, tension, damping, boundary, running, speed };

  const c = TENSION_SPEED[tension];
  const wavelength = wavelengthFromSpeed(c, frequency);
  const period = periodFromFreq(frequency);

  useEffect(() => {
    lineRef.current = createWaveLine(GRID_N, DOMAIN_M / (GRID_N - 1));
    return () => {
      lineRef.current = null;
    };
  }, []);

  function reset() {
    if (lineRef.current) resetWaveLine(lineRef.current);
    timeRef.current = 0;
    historyBufferRef.current = [];
    setTimeHistory([]);
    setRunning(false);
  }

  useEffect(() => {
    let raf: number;
    function frame() {
      const line = lineRef.current;
      const canvas = canvasRef.current;
      const p = paramsRef.current;
      if (line && canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx && p.running) {
          const cNow = TENSION_SPEED[p.tension];
          const gamma = DAMPING_GAMMA[p.damping];
          const amplitudeM = p.amplitudeCm / 100;
          const physicsDt = stableDt(line.dx, cNow);
          const frameDt = (1 / 60) * p.speed;
          const substeps = Math.max(1, Math.min(40, Math.round(frameDt / physicsDt)));

          for (let s = 0; s < substeps; s++) {
            timeRef.current += physicsDt;
            stepWaveLine(line, {
              c: cNow,
              dt: physicsDt,
              amplitude: amplitudeM,
              angularFreq: 2 * Math.PI * p.frequency,
              time: timeRef.current,
              boundary: p.boundary,
              gamma,
            });
          }

          // track displacement at mid-string for the time-domain graph
          const midIdx = Math.floor(line.n / 2);
          historyBufferRef.current.push({ x: timeRef.current, y: line.y[midIdx] });
          const windowS = 4;
          historyBufferRef.current = historyBufferRef.current.filter((pt) => pt.x > timeRef.current - windowS);
        }

        drawString(ctx!, line, p.boundary, wavelengthFromSpeed(TENSION_SPEED[p.tension], p.frequency));

        frameCountRef.current += 1;
        if (frameCountRef.current % 3 === 0) {
          setSnapshot(Array.from(line.y));
          setTimeHistory(historyBufferRef.current.map((pt) => ({ x: pt.x - (timeRef.current - 4), y: pt.y })));
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawString(ctx: CanvasRenderingContext2D, line: WaveLineState, boundaryType: BoundaryType, lambda: number) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#0D1412";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const midY = CANVAS_H / 2;

    // equilibrium line
    ctx.strokeStyle = "#3A4B48";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(CANVAS_W, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // wave
    ctx.strokeStyle = "#5FC7B8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < line.n; i++) {
      const px = (i / (line.n - 1)) * CANVAS_W;
      const py = midY - line.y[i] * PX_PER_M_Y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // source marker
    ctx.fillStyle = "#E8A33D";
    ctx.beginPath();
    ctx.arc(0, midY - line.y[0] * PX_PER_M_Y, 5, 0, Math.PI * 2);
    ctx.fill();

    // boundary marker
    ctx.fillStyle = boundaryType === "open" ? "#5C726C" : "#8FA39D";
    if (boundaryType !== "open") {
      ctx.fillRect(CANVAS_W - 4, midY - 40, 4, 80);
    }

    // propagation arrow
    ctx.strokeStyle = "#8FA39D";
    ctx.fillStyle = "#8FA39D";
    ctx.font = "10px sans-serif";
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(60, 20);
    ctx.lineTo(54, 16);
    ctx.moveTo(60, 20);
    ctx.lineTo(54, 24);
    ctx.stroke();
    ctx.fillText("propagation", 20, 34);

    // wavelength double-headed arrow (approx, steady state)
    if (lambda > 0 && lambda < DOMAIN_M) {
      const x1 = 40;
      const x2 = x1 + lambda * PX_PER_M_X;
      const yA = 20 + 30;
      ctx.strokeStyle = "#E8A33D";
      ctx.beginPath();
      ctx.moveTo(x1, yA);
      ctx.lineTo(x2, yA);
      ctx.stroke();
      ctx.fillStyle = "#E8A33D";
      ctx.fillText("λ", (x1 + x2) / 2 - 3, yA - 4);
    }

    ctx.fillStyle = "#8FA39D";
    ctx.font = "10px sans-serif";
    ctx.fillText(boundaryType === "fixed" ? "fixed end" : boundaryType === "loose" ? "loose end" : "open end", CANVAS_W - 60, midY - 46);
  }

  const graphPoints = useMemo(
    () => snapshot.map((v, i) => ({ x: (i / (GRID_N - 1)) * DOMAIN_M, y: v })),
    [snapshot]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-5">
        <SliderField label="Frequency" unit=" Hz" min={0.1} max={10} step={0.1} value={frequency} onChange={setFrequency} />
        <SliderField label="Amplitude" unit=" cm" min={0} max={100} step={1} value={amplitudeCm} onChange={setAmplitudeCm} />
        <SegmentedField
          label="Tension"
          value={tension}
          onChange={setTension}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
        <SegmentedField
          label="Damping"
          value={damping}
          onChange={setDamping}
          options={[
            { value: "none", label: "None" },
            { value: "low", label: "Low" },
            { value: "medium", label: "Med" },
            { value: "high", label: "High" },
          ]}
        />
        <SegmentedField
          label="Boundary type"
          value={boundary}
          onChange={setBoundary}
          options={[
            { value: "fixed", label: "Fixed" },
            { value: "loose", label: "Loose" },
            { value: "open", label: "Open" },
          ]}
        />
        <EquationBox
          lines={[
            `v = f×λ = ${c.toFixed(1)} × ${wavelength.toFixed(2)} ≈ ${(c).toFixed(1)} m/s`,
            `T = 1/f = ${period.toFixed(2)} s`,
          ]}
        />
        <MisconceptionTip
          wrong="Waves move matter from one place to another."
          right="Waves transfer energy — each bit of string just oscillates up and down in place."
        />
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
            { label: "Frequency (f)", value: `${frequency.toFixed(1)} Hz` },
            { label: "Wavelength (λ)", value: `${wavelength.toFixed(2)} m` },
            { label: "Wave speed (v)", value: `${c.toFixed(1)} m/s` },
            { label: "Amplitude (A)", value: `${(amplitudeCm / 100).toFixed(2)} m` },
            { label: "Period (T)", value: `${period.toFixed(2)} s` },
            { label: "Boundary", value: boundary, muted: true },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Displacement vs. position</div>
            <WaveChart points={graphPoints} xLabel="x (m)" yLabel="y (m)" xMax={DOMAIN_M} yMax={Math.max(0.2, amplitudeCm / 100)} />
          </div>
          <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Displacement vs. time (mid-string)</div>
            <WaveChart points={timeHistory} xLabel="t (s)" yLabel="y (m)" xMax={4} yMax={Math.max(0.2, amplitudeCm / 100)} />
          </div>
        </div>
      </div>
    </div>
  );
}

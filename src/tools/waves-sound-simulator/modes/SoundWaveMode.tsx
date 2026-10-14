import { useEffect, useMemo, useRef, useState } from "react";
import { SoundMedium } from "../types";
import {
  MEDIUM_SPEED,
  SOUND_VISUAL_SCALE,
  createWaveLine,
  resetWaveLine,
  stableDt,
  stepWaveLine,
  WaveLineState,
  periodFromFreq,
  wavelengthFromSpeed,
  nearestNote,
  loudnessLabel,
} from "../physics";
import { SliderField, SelectField, StatGrid, EquationBox, PlaybackControls, MisconceptionTip } from "../components/Controls";
import WaveChart from "../components/WaveChart";
import { useOscillator } from "../components/useOscillator";

const DOMAIN_M = 8;
const GRID_N = 160;
const N_PARTICLES = 44;
const CANVAS_W = 720;
const CANVAS_H = 220;
const AIR_SPEED = 343;

export default function SoundWaveMode() {
  const [frequency, setFrequency] = useState(2); // visual compressions/sec you can actually see
  const [amplitudeCm, setAmplitudeCm] = useState(50); // linked to volume
  const [medium, setMedium] = useState<SoundMedium>("air");
  const [pitchHz, setPitchHz] = useState(440); // used only for real audio + "wavelength in air" stat
  const [playSound, setPlaySound] = useState(false);
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [snapshot, setSnapshot] = useState<number[]>(new Array(GRID_N).fill(0));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineRef = useRef<WaveLineState | null>(null);
  const timeRef = useRef(0);
  const frameCountRef = useRef(0);
  const paramsRef = useRef({ frequency, amplitudeCm, medium, running, speed });
  paramsRef.current = { frequency, amplitudeCm, medium, running, speed };

  const period = periodFromFreq(frequency);
  const wavelengthInAir = wavelengthFromSpeed(AIR_SPEED, pitchHz);
  const wavelengthInMedium = wavelengthFromSpeed(MEDIUM_SPEED[medium], pitchHz);

  useOscillator({ enabled: playSound, frequencyHz: pitchHz, amplitude: amplitudeCm, muted });

  useEffect(() => {
    lineRef.current = createWaveLine(GRID_N, DOMAIN_M / (GRID_N - 1));
    return () => {
      lineRef.current = null;
    };
  }, []);

  function reset() {
    if (lineRef.current) resetWaveLine(lineRef.current);
    timeRef.current = 0;
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
          const cNow = MEDIUM_SPEED[p.medium] * SOUND_VISUAL_SCALE;
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
              boundary: "open",
              gamma: 0,
            });
          }
        }
        drawTube(ctx!, line);
        frameCountRef.current += 1;
        if (frameCountRef.current % 3 === 0) setSnapshot(Array.from(line.y));
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawTube(ctx: CanvasRenderingContext2D, line: WaveLineState) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#0D1412";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const midY = CANVAS_H / 2;

    // tube walls
    ctx.strokeStyle = "#2A3A37";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, midY - 50, CANVAS_W - 60, 100);

    // speaker cone at left, driven by y[0]
    const conePush = line.y[0] * 300;
    ctx.fillStyle = "#4A4A4A";
    ctx.beginPath();
    ctx.moveTo(10, midY - 55);
    ctx.lineTo(30 + conePush, midY - 15);
    ctx.lineTo(30 + conePush, midY + 15);
    ctx.lineTo(10, midY + 55);
    ctx.closePath();
    ctx.fill();

    // particles sampled from the field, displaced horizontally
    const usableW = CANVAS_W - 90;
    for (let i = 0; i < N_PARTICLES; i++) {
      const restX = 45 + (i / (N_PARTICLES - 1)) * usableW;
      const gridIdx = Math.min(line.n - 1, Math.round((i / (N_PARTICLES - 1)) * (line.n - 1)));
      const nextIdx = Math.min(line.n - 1, gridIdx + 2);
      const disp = line.y[gridIdx] * 800;
      const localSpacing = (nextIdx - gridIdx) * line.dx + (line.y[nextIdx] - line.y[gridIdx]);
      const restSpacing = (nextIdx - gridIdx) * line.dx;
      const compressionRatio = restSpacing > 0 ? localSpacing / restSpacing : 1;

      let color = "#8FA39D";
      if (compressionRatio < 0.94) color = "#4A90E2"; // compression -> blue
      else if (compressionRatio > 1.06) color = "#E85A4A"; // rarefaction -> red

      ctx.beginPath();
      ctx.arc(restX + disp, midY, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.fillStyle = "#8FA39D";
    ctx.font = "10px sans-serif";
    ctx.fillText("compression", 40, midY - 60);
    ctx.fillStyle = "#4A90E2";
    ctx.beginPath();
    ctx.arc(115, midY - 63, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8FA39D";
    ctx.fillText("rarefaction", 40, midY + 72);
    ctx.fillStyle = "#E85A4A";
    ctx.beginPath();
    ctx.arc(115, midY + 69, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const graphPoints = useMemo(
    () => snapshot.map((v, i) => ({ x: (i / (GRID_N - 1)) * DOMAIN_M, y: v })),
    [snapshot]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-5">
        <SliderField label="Frequency (visual)" unit=" Hz" min={0.1} max={10} step={0.1} value={frequency} onChange={setFrequency} />
        <SliderField label="Amplitude / volume" unit=" cm" min={0} max={100} step={1} value={amplitudeCm} onChange={setAmplitudeCm} />
        <SelectField
          label="Medium"
          value={medium}
          onChange={setMedium}
          options={[
            { value: "air", label: "Air (343 m/s)" },
            { value: "water", label: "Water (1480 m/s)" },
            { value: "steel", label: "Steel (5960 m/s)" },
          ]}
        />

        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Audio playback</div>
          <SliderField label="Pitch" unit=" Hz" min={80} max={2000} step={1} value={pitchHz} onChange={setPitchHz} />
          <div className="text-[10px] text-[#5C726C]">
            Uses real audible frequencies (20 Hz–20 kHz range) — decoupled from the slow visual frequency above so
            you can actually see individual compressions.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPlaySound((v) => !v)}
              className={`flex-1 rounded py-2 text-sm border transition-colors min-h-[44px] ${
                playSound ? "bg-[#5FC7B8] border-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] border-[#2A3A37] text-[#ECF2F0]"
              }`}
            >
              {playSound ? "🔊 Playing" : "▶ Play sound"}
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              className={`rounded px-3 py-2 text-sm border transition-colors min-h-[44px] ${
                muted ? "border-[#E8A33D] text-[#E8A33D]" : "border-[#2A3A37] text-[#8FA39D]"
              }`}
            >
              {muted ? "Muted" : "Mute"}
            </button>
          </div>
          {pitchHz > 15000 && <div className="text-[10px] text-[#E8A33D]">Above ~15 kHz may be inaudible to adults.</div>}
        </div>

        <EquationBox
          lines={[
            `v (${medium}) = ${MEDIUM_SPEED[medium]} m/s`,
            `λ in air = v/f = ${wavelengthInAir.toFixed(3)} m`,
          ]}
        />
        <MisconceptionTip wrong="Sound can travel through a vacuum." right="Sound needs a medium — no particles means no sound." />
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
            { label: "Pitch", value: `${pitchHz} Hz (${nearestNote(pitchHz)})` },
            { label: "Loudness", value: loudnessLabel(amplitudeCm) },
            { label: "Wavelength in air", value: `${wavelengthInAir.toFixed(3)} m` },
            { label: `Wavelength in ${medium}`, value: `${wavelengthInMedium.toFixed(3)} m` },
            { label: "Period (T)", value: `${period.toFixed(2)} s` },
            { label: "Visual freq.", value: `${frequency.toFixed(1)} Hz`, muted: true },
          ]}
        />

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-3">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Displacement vs. position (in tube)</div>
          <WaveChart points={graphPoints} xLabel="x (m)" yLabel="y (m)" xMax={DOMAIN_M} yMax={Math.max(0.2, amplitudeCm / 100)} />
        </div>
      </div>
    </div>
  );
}
